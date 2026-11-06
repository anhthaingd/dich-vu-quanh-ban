import {withLabFinanceSecret} from './database.mjs';
import {checkMedia,cleanMedia,mediaCredentials} from './lab-media.mjs';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateConfig, privateJson, readJson, lock, requireConfirmation, assertIdentity, assertJournal, runner, awsClient, terraformVariables, rememberState, cloudflare, auditResources, assertCleanState, assertStateIdentity, abortLabUploads } from './lab-core.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const tfRoot = join(root, 'infra/aws/lab');
export function parseArgs(args) {
  const action = args.shift();
  if (!['init','up','down','status','admin','media-check','help'].includes(action)) throw Error('Use init, up, down, status, admin, media-check or help.');
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const k = args[i].replace(/^--/, '');
    if (!args[i].startsWith('--') || Object.hasOwn(options, k)) throw Error('Invalid or duplicate option.');
    if (['apply','accept-data-loss','live'].includes(k)) options[k] = true;
    else if (['config','lab','confirm','email'].includes(k) && args[i + 1] && !args[i + 1].startsWith('--')) options[k] = args[++i];
    else throw Error(`Unknown or incomplete option: ${args[i]}`);
  }
  return { action, options };
}

export function validatePrerequisites(c, aws) {
  assertIdentity(c, aws(['sts','get-caller-identity']));
  const cert = aws(['acm','describe-certificate','--certificate-arn',c.certificate_arn], 'us-east-1').Certificate;
  if (cert?.Status !== 'ISSUED' || !['app','admin','api'].every(k => cert.SubjectAlternativeNames?.some(n => n === `${k}.${c.domain}` || n === `*.${c.domain}`))) throw Error('ACM certificate must be ISSUED and cover app/admin/api.');
  if (cert.Options?.Export === 'ENABLED') throw Error('Use a non-exportable public ACM certificate for this lab.');
  if(c.email_provider === 'resend') return; // Sender DNS verification is completed in Resend before deployment.
  // Require explicit email identities in sandbox; no implicit production-access assumption.
  for (const email of new Set([c.email_from ?? c.ses_from,...c.pilot_emails])) {
    if (!aws(['sesv2','get-email-identity','--email-identity',email]).VerifiedForSendingStatus) throw Error(`SES email must be verified: ${email}`);
  }
  if (!aws(['sesv2','get-account']).SendingEnabled) throw Error('SES sending is disabled.');
}

async function main() {
  process.umask(0o077);
  const { action, options } = parseArgs(process.argv.slice(2));
  if (action === 'help') {
    console.log('AWS-02: init --config FILE; up/down --lab ID (plan only); add --apply --confirm ACCOUNT/ID to execute. down also requires --accept-data-loss. status --lab ID is local; add --live for AWS audit. admin --lab ID --email VERIFIED_EMAIL --apply --confirm ACCOUNT/ID. media-check --lab ID probes LiveKit policy without AWS/DNS changes. Read infra/aws/lab/README.md first.'); return;
  }
  let c;
  if (action === 'init') c = validateConfig(readJson(resolve(options.config ?? 'infra/aws/lab/config.example.json')));
  else {
    if (!/^[a-z][a-z0-9-]{2,11}$/.test(options.lab ?? '') || options.lab.endsWith('-')) throw Error('Use --lab with the initialized lab ID.');
    c = validateConfig(readJson(join(root, '.local/aws-lab', options.lab, 'config.json')));
  }
  const dir = join(root, '.local/aws-lab', c.lab_id);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const unlock = lock(dir);
  const journalPath = join(dir, 'journal.json');
  let j;
  try {
    if (!existsSync(journalPath) && existsSync(join(dir, 'terraform.tfstate'))) throw Error('Existing state has no journal. Restore its matching journal; init cannot adopt it.');
    j = existsSync(journalPath) ? readJson(journalPath) : { account: c.expected_account_id, lab_id: c.lab_id, region: c.region, domain: c.domain, phase: 'initialized', observed: [] };
    assertJournal(c, j);
    if(j.media_url!==undefined&&(c.livekit_url??'')!==j.media_url)throw Error('LiveKit project differs from this lab journal; restore config and finish cleanup first.');
    const save = () => privateJson(journalPath, j);
    if (action === 'init') {
      const configPath = join(dir, 'config.json');
      if (existsSync(configPath) && JSON.stringify(readJson(configPath)) !== JSON.stringify(c)) throw Error('Existing config differs. Review/edit the private config deliberately; init never overwrites it.');
      privateJson(configPath, c); save();
      console.log(`Initialized local lab ${c.lab_id}. No AWS/Cloudflare requests. Next: configure SSO, ACM, email provider and token as documented.`); return;
    }
    if(action==='media-check'){if(!c.livekit_url)throw Error('LiveKit is not configured for this lab.');await checkMedia(c);console.log('LiveKit explicit-room policy probe passed. No room was created. Audio and token revocation still need live acceptance checks.');return;}
    const run = runner(c, dir), aws = awsClient(run, c.region);
    if (action === 'status' && !options.live) { console.log(JSON.stringify({ lab: c.lab_id, account: c.expected_account_id, phase: j.phase, updated: j.updated, lastAudit: j.lastAudit, note: 'Local journal only; not current AWS or billing evidence.' }, null, 2)); return; }
    assertIdentity(c, aws(['sts','get-caller-identity']));
    if (action === 'status') {
      const resources = auditResources(c, aws, j);
      privateJson(join(dir, 'audit.json'), { at: new Date().toISOString(), resources, billing: 'not-checked' });
      console.log(JSON.stringify({ resources, billing: 'not-checked', note: 'Read-only enumeration. Review other regions/account subscriptions and delayed billing separately.' }, null, 2)); return;
    }
    assertCleanState(dir, j);
    if (action === 'up' && j.intent === 'down') throw Error('Cleanup is incomplete. Resume down and its audit before creating another lab.');
    const statePath = join(dir, 'terraform.tfstate');
    if (existsSync(statePath)) assertStateIdentity(c, readJson(statePath), j);
    const tf = (args, inherit = false) => run('terraform', [`-chdir=${tfRoot}`, ...args], inherit ? { stdio: 'inherit' } : {});
    tf(['init','-input=false',`-backend-config=path=${statePath}`], true);
    // A named Terraform workspace would create a second state beside this lab.
    if (tf(['workspace','show']).trim() !== 'default') throw Error('Only the default local workspace is allowed.');
    const checkpoint = (afterAuthorizedApply = false) => {
      if (existsSync(statePath)) {
        const state = readJson(statePath); assertStateIdentity(c, state, j, afterAuthorizedApply);
        j.lineage = state.lineage; rememberState(state, j);
      }
      j.updated = new Date().toISOString(); save();
    };
    const output = () => {
      const d = JSON.parse(tf(['output','-json','deployment']));
      if (d.account_id !== c.expected_account_id || d.lab_id !== c.lab_id || d.region !== c.region || d.api_origin !== `https://api.${c.domain}`) throw Error('Terraform output identity mismatch.');
      return d;
    };
    const plan = (destroy = false) => {
      privateJson(join(dir, 'inputs.tfvars.json'), terraformVariables(c, j));
      const p = join(dir, destroy ? 'destroy.tfplan' : 'deploy.tfplan');
      tf(['plan','-input=false',...(destroy ? ['-destroy'] : []),`-var-file=${join(dir, 'inputs.tfvars.json')}`,`-out=${p}`], true);
      return p;
    };
    const applyPlan = (p, stage) => {
      j.phase = stage; checkpoint();
      try { tf(['apply','-input=false',p], true); }
      finally { checkpoint(true); }
    };
    const ops = (d, command, email) => {
      if (email && !c.pilot_emails.includes(email)) throw Error('Admin email must be in the explicit tester allowlist.');
      const result = aws(['ecs','run-task','--cluster',d.cluster,'--task-definition',d.ops_task,'--launch-type','FARGATE',
        '--network-configuration',JSON.stringify({ awsvpcConfiguration: { subnets: d.subnets, securityGroups: [d.security_group], assignPublicIp: 'ENABLED' } }),
        '--overrides',JSON.stringify({ containerOverrides: [{ name: 'ops', command: ['node','scripts/aws/database.mjs',command,...(email ? [email] : [])] }] })]);
      if (result.failures?.length || result.tasks?.length !== 1) throw Error('ECS refused the operation task.');
      j.opsTask = result.tasks[0].taskArn; checkpoint();
      aws(['ecs','wait','tasks-stopped','--cluster',d.cluster,'--tasks',j.opsTask]);
      const stopped = aws(['ecs','describe-tasks','--cluster',d.cluster,'--tasks',j.opsTask]);
      if (stopped.failures?.length || stopped.tasks?.[0]?.containers?.find(x => x.name === 'ops')?.exitCode !== 0) throw Error(`Database task failed; inspect ${d.log_group}. Do not enable API.`);
      delete j.opsTask; checkpoint();
    };
    if (action === 'admin') {
      if (!options.apply) throw Error('admin requires --apply and explicit account/lab confirmation. Register and verify the email in the app first.');
      requireConfirmation(c, options);
      if (!options.email || !c.pilot_emails.includes(options.email)) throw Error('Provide an allowlisted verified email.');
      ops(output(), 'bootstrap-admin', options.email); console.log('Admin grants bootstrapped; app MFA is still required.'); return;
    }
    const dns = cloudflare(c, process.env.CLOUDFLARE_API_TOKEN);
    await dns.preflight();
    if (action === 'down') {
      checkpoint();
      const p = plan(true);
      if (!options.apply) { console.log('Destroy plan only. No data or DNS deleted.'); return; }
      requireConfirmation(c, options, true);
      mediaCredentials(c); // Fail before stopping resources when cloud media cleanup cannot authenticate.
      j.intent = 'down'; checkpoint();
      // Remove owned DNS before deleting targets; failed partial removal is retried safely.
      await dns.sync({}, true);
      const cluster = `dvqb-lab-${c.lab_id}`;
      const clusters = aws(['ecs','list-clusters']).clusterArns ?? [];
      const ownCluster = clusters.find(x => x.split('/').at(-1) === cluster);
      if (ownCluster) {
        const services = aws(['ecs','list-services','--cluster',ownCluster]).serviceArns ?? [];
        const api = services.find(x => x.split('/').at(-1) === `${cluster}-api`);
        if (api) {
          aws(['ecs','update-service','--cluster',ownCluster,'--service',api,'--desired-count','0']);
          aws(['ecs','wait','services-stable','--cluster',ownCluster,'--services',api]);
        }
        // Ops tasks may outlive a disconnected terminal. Never stop tasks in another cluster.
        const tasks = aws(['ecs','list-tasks','--cluster',ownCluster]).taskArns ?? [];
        for (const task of tasks) aws(['ecs','stop-task','--cluster',ownCluster,'--task',task,'--reason','Owner-confirmed disposable lab cleanup']);
        for (const task of tasks) aws(['ecs','wait','tasks-stopped','--cluster',ownCluster,'--tasks',task]);
      }
      j.phase='cleaning-media';checkpoint();
      await cleanMedia(c); // Failure retains state/journal so cleanup can be retried.
      abortLabUploads(c, aws);
      applyPlan(p, 'destroying');
      if (tf(['state','list']).trim()) throw Error('Terraform still contains resources; cleanup incomplete.');
      j.phase = 'auditing-cleanup'; j.image_digest = ''; j.migration_image_digest = ''; j.service_enabled = false; delete j.opsTask; checkpoint();
      const resources = auditResources(c, aws, j);
      j.lastAudit = new Date().toISOString();
      privateJson(join(dir, 'audit.json'), { at: j.lastAudit, resources, billing: 'not-checked' });
      if (resources.length) throw Error('Cleanup incomplete: remaining resources recorded in audit.json. Retry/inspect; billing not certified.');
      j.phase = 'resources-removed-billing-pending'; delete j.intent; checkpoint();
      console.log('No lab resources found by the required scans. State/journal retained. Check AWS Billing for the usage interval after cleanup; zero account bill is NOT certified.'); return;
    }
    validatePrerequisites(c, aws);
    await checkMedia(c);
    if (!options.apply) { plan(); console.log('Plan only. up --apply will also stage an image, initialize DB, enable API, update owned DNS and publish web. Review the documented full scope.'); return; }
    requireConfirmation(c, options);
    if(c.email_provider === 'resend' && !/^re_[A-Za-z0-9_-]+$/.test(process.env.RESEND_API_KEY ?? '')) throw Error('Load RESEND_API_KEY in this terminal before deployment; never put it in config or Git.');
    if(c.expo_push&&!process.env.EXPO_ACCESS_TOKEN?.trim())throw Error('Load EXPO_ACCESS_TOKEN and enable enhanced push security in the Expo project.');
    if (!process.env.GEOAPIFY_API_KEY || !process.env.EXPO_PUBLIC_GEOAPIFY_MAPS_KEY) throw Error('Load private GEOAPIFY_API_KEY and public EXPO_PUBLIC_GEOAPIFY_MAPS_KEY into this terminal (not Git/config).');
    if (run('git',['status','--porcelain'],{ cwd: root }).trim()) throw Error('Deployment requires a reviewed clean commit; do not build uncommitted source into a release image.');
    run('npm',['run','sdd:check','--','--change','SDD-PROJECT','--phase','verify'],{ cwd: root, stdio: 'inherit' });
    const sha = run('git',['rev-parse','HEAD'],{ cwd: root }).trim();
    if (j.service_enabled && j.source && j.source !== sha) throw Error('This tool recreates learning labs, not in-place upgrades. Finish cleanup before deploying another commit.');
    j.source = sha; j.media_url=c.livekit_url??''; j.intent = 'up'; checkpoint();
    const localImage = `dvqb-lab-${c.lab_id}:${sha}`;
    run('docker',['build','--platform','linux/amd64','-f','infra/aws/Dockerfile','-t',localImage,'.'],{ cwd: root, stdio: 'inherit' });
    applyPlan(plan(), 'creating');
    let d = output();
    const registry = d.repository_url.split('/')[0];
    const password = run('aws',['ecr','get-login-password','--region',c.region]);
    const dockerConfig = join(dir, 'docker-auth'); mkdirSync(dockerConfig, { mode: 0o700, recursive: true });
    try {
      run('docker',['--config',dockerConfig,'login','--username','AWS','--password-stdin',registry],{ input: password });
      run('docker',['tag',localImage,`${d.repository_url}:${sha}`]);
      // Reuse only an exact immutable commit tag if a previous interrupted run pushed it.
      const images = aws(['ecr','list-images','--repository-name',d.repository_name]).imageIds ?? [];
      if (!images.some(x => x.imageTag === sha)) run('docker',['--config',dockerConfig,'push',`${d.repository_url}:${sha}`],{ stdio: 'inherit' });
    } finally { const auth = join(dockerConfig, 'config.json'); if (existsSync(auth)) unlinkSync(auth); }
    const digest = aws(['ecr','describe-images','--repository-name',d.repository_name,'--image-ids',`imageTag=${sha}`]).imageDetails?.[0]?.imageDigest;
    if (!/^sha256:[a-f0-9]{64}$/.test(digest ?? '')) throw Error('Missing immutable image digest.');
    j.migration_image_digest = digest; checkpoint();
    applyPlan(plan(), 'staging-database'); d = output();
    ops(d, 'bootstrap');
    const runtime = withLabFinanceSecret(JSON.parse(aws(['secretsmanager','get-secret-value','--secret-id',d.runtime_secret_arn]).SecretString),c.finance_test===true);
    if(c.email_provider === 'resend') runtime.RESEND_API_KEY = process.env.RESEND_API_KEY;
    else delete runtime.RESEND_API_KEY;
    for(const key of ['LIVEKIT_API_KEY','LIVEKIT_API_SECRET']){if(c.livekit_url)runtime[key]=process.env[key];else delete runtime[key];}
    if(c.expo_push)runtime.EXPO_ACCESS_TOKEN=process.env.EXPO_ACCESS_TOKEN;else delete runtime.EXPO_ACCESS_TOKEN;
    runtime.GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY;
    // Pass the secret over stdin, never command arguments, terminal output or a disk file.
    run('aws',['secretsmanager','put-secret-value','--secret-id',d.runtime_secret_arn,'--secret-string','file:///dev/stdin','--region',c.region,'--output','json'],{ input: JSON.stringify(runtime) });
    j.image_digest = digest; j.service_enabled = true; checkpoint();
    applyPlan(plan(), 'starting-api'); d = output();
    // ECS injects secret values only at task start, including a resumed run with the same digest.
    aws(['ecs','update-service','--cluster',d.cluster,'--service',d.service,'--force-new-deployment']);
    aws(['ecs','wait','services-stable','--cluster',d.cluster,'--services',d.service]);
    const service = aws(['ecs','describe-services','--cluster',d.cluster,'--services',d.service]).services?.[0];
    if (!d.api_task || !service || service.runningCount < 1 || !service.deployments?.some(x => x.status === 'PRIMARY' && x.rolloutState === 'COMPLETED' && x.taskDefinition === d.api_task)) throw Error('API has not reached the expected completed running deployment; a rollback is not a successful release.');
    await dns.sync(d.dns_records);
    const smoke = async url => { const r = await fetch(url, { signal: globalThis.AbortSignal.timeout(30000) }); if (!r.ok) throw Error(`HTTPS check failed: ${url} (${r.status}). DNS may still be propagating; retry up.`); };
    await smoke(`${d.api_origin}/v1/ready`);
    const buildEnv = { ...process.env, EXPO_PUBLIC_API_URL: `${d.api_origin}/v1`, VITE_API_URL: `${d.api_origin}/v1`, EXPO_PUBLIC_REALTIME_ENABLED: c.realtime?'1':'0', EXPO_PUBLIC_PUSH_ENABLED: c.expo_push?'1':'0', EXPO_PUBLIC_EAS_PROJECT_ID:c.expo_project_id??'', EXPO_NO_TELEMETRY: '1' };
    // Build tools need no cloud credentials. Keep only the public map key in the web bundle.
    for (const key of Object.keys(buildEnv)) if (key.startsWith('AWS_') || key.startsWith('FINANCE_') || key === 'CLOUDFLARE_API_TOKEN' || key === 'GEOAPIFY_API_KEY' || key === 'RESEND_API_KEY' || key.startsWith('LIVEKIT_') || key === 'EXPO_ACCESS_TOKEN' || key === 'EXPO_TOKEN') delete buildEnv[key];
    run('npx',['expo','export','--platform','web'],{ cwd: join(root,'apps/mobile'), env: buildEnv, stdio: 'inherit' });
    run('npm',['run','build','--workspace','apps/admin'],{ cwd: root, env: buildEnv, stdio: 'inherit' });
    for (const [key, folder] of [['web','apps/mobile/dist'],['admin','apps/admin/dist']]) {
      const target = d.web[key];
      run('aws',['s3','sync',join(root,folder),`s3://${target.bucket}`,'--exclude','index.html','--cache-control','public,max-age=3600','--region',c.region],{ stdio: 'inherit' });
      run('aws',['s3','cp',join(root,folder,'index.html'),`s3://${target.bucket}/index.html`,'--cache-control','no-cache,no-store,must-revalidate','--content-type','text/html','--region',c.region],{ stdio: 'inherit' });
      const inv = aws(['cloudfront','create-invalidation','--distribution-id',target.distribution_id,'--paths','/*']);
      aws(['cloudfront','wait','invalidation-completed','--distribution-id',target.distribution_id,'--id',inv.Invalidation.Id]);
      await smoke(target.url);
    }
    await smoke(`${d.api_origin}/v1/categories`);
    j.phase = 'ready'; delete j.intent; j.lastAudit = null; checkpoint();
    console.log(`Ready for lab checks: ${d.web.web.url} / ${d.web.admin.url}. Register/verify owner, then lab:admin. This is not full UAT or production certification. When finished run lab:down.`);
  } catch (e) {
    if (j && j.account === c.expected_account_id && j.lab_id === c.lab_id && j.region === c.region && j.domain === c.domain) {
      j.lastFailure = { at: new Date().toISOString(), action, phase: j.phase };
      privateJson(journalPath, j);
    }
    throw e;
  } finally { unlock(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(e => { console.error(e.message); console.error('If AWS creation started, resources may still be billable. Keep local state/journal; inspect status --live and resume the same lab or clean it up.'); process.exitCode = 1; });
}
