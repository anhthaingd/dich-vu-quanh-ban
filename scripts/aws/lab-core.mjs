import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync, openSync, closeSync, existsSync, chmodSync } from 'node:fs';
import { join } from 'node:path';

export function validateConfig(c) {
  if (!c || !/^[a-z][a-z0-9-]{2,11}$/.test(c.lab_id ?? '') || c.lab_id.endsWith('-')) throw Error('lab_id: use 3–12 lowercase letters/numbers/hyphens.');
  if (!/^\d{12}$/.test(c.expected_account_id ?? '')) throw Error('expected_account_id must contain 12 digits.');
  if (c.region !== 'ap-southeast-1') throw Error('This lab is validated for ap-southeast-1 only.');
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(c.domain ?? '')) throw Error('Invalid domain.');
  if (!/^[a-zA-Z0-9][\w-]{0,63}$/.test(c.profile ?? '')) throw Error('Explicit AWS CLI profile required.');
  if (!/^[a-f0-9]{32}$/.test(c.cloudflare_zone_id ?? '')) throw Error('Cloudflare zone ID required.');
  if (!new RegExp(`^arn:aws:acm:us-east-1:${c.expected_account_id}:certificate/[a-f0-9-]{36}$`).test(c.certificate_arn ?? '')) throw Error('Certificate must belong to this account in us-east-1.');
  const email = x => typeof x === 'string' && /^[^\s,@]+@[^\s,@]+\.[^\s,@]+$/.test(x);
  if (!email(c.email_from ?? c.ses_from) || !email(c.alert_email) || !Array.isArray(c.pilot_emails) || !c.pilot_emails.length || !c.pilot_emails.every(email)) throw Error('Sender, alert email and explicit tester emails required.');
  if (!Number.isFinite(c.monthly_budget_usd) || c.monthly_budget_usd <= 0 || c.monthly_budget_usd > 1000) throw Error('Set a positive monthly alert budget up to 1000; it does not cap spending.');
  if(c.email_provider !== undefined && !['ses','resend'].includes(c.email_provider)) throw Error('Invalid email provider.');
  if(c.email_from && c.ses_from && c.email_from !== c.ses_from) throw Error('Conflicting email senders.');
  for(const key of ['realtime','expo_push','finance_test'])if(c[key]!==undefined&&typeof c[key]!=='boolean')throw Error('Capability flags must be boolean.');
  if(c.livekit_url){const u=new URL(c.livekit_url);if(!c.realtime||u.protocol!=='wss:'||!/^([a-z0-9-]+)\.livekit\.cloud$/.test(u.hostname)||u.port||u.pathname!=='/'||u.search||u.hash||u.username||u.password)throw Error('Use a dedicated LiveKit Cloud URL with singleton realtime.');}
  if(c.expo_push&&(!c.realtime||!/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.test(c.expo_project_id??'')))throw Error('Push requires realtime and an Expo project UUID.');
  const keys = ['lab_id','expected_account_id','region','domain','profile','cloudflare_zone_id','certificate_arn','email_provider','email_from','finance_test','realtime','livekit_url','expo_push','expo_project_id','ses_from','alert_email','pilot_emails','monthly_budget_usd'];
  if (Object.keys(c).some(k => !keys.includes(k))) throw Error('Unexpected config key; secrets do not belong in config.json.');
  return c;
}

export function privateJson(path, value) {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  renameSync(tmp, path); chmodSync(path, 0o600);
}
export function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }
export function lock(dir) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = join(dir, 'operation.lock');
  let fd;
  try { fd = openSync(file, 'wx', 0o600); } catch { throw Error('Lab is locked. Check the recorded PID and previous operation before manually removing operation.lock.'); }
  writeFileSync(fd, JSON.stringify({ pid: process.pid, started: new Date().toISOString() })); closeSync(fd);
  return () => unlinkSync(file);
}
export function requireConfirmation(c, options, destructive = false) {
  if (options.confirm !== `${c.expected_account_id}/${c.lab_id}`) throw Error(`Review the plan, then pass --confirm ${c.expected_account_id}/${c.lab_id}.`);
  if (destructive && !options['accept-data-loss']) throw Error('Deleting lab data requires --accept-data-loss.');
}
export function assertIdentity(c, identity) {
  if (identity.Account !== c.expected_account_id || identity.Arn?.endsWith(':root')) throw Error('Wrong AWS account or root identity; no mutation allowed.');
}
export function assertJournal(c, j) {
  if (j.account !== c.expected_account_id || j.lab_id !== c.lab_id || j.region !== c.region || j.domain !== c.domain) throw Error('Config identity differs from the lab journal. Restore the original config; never reuse another lab state.');
}
export function cleanEnvironment(source = process.env) {
  return Object.fromEntries(Object.entries(source).filter(([k]) => !k.startsWith('TF_VAR_') && !k.startsWith('TF_CLI_ARGS') && !['TF_WORKSPACE','TF_DATA_DIR','AWS_ENDPOINT_URL','AWS_ENDPOINT_URL_STS'].includes(k) && !k.startsWith('AWS_ENDPOINT_URL_')));
}
export function runner(c, dir) {
  const env = { ...cleanEnvironment(), AWS_PROFILE: c.profile, AWS_REGION: c.region, AWS_DEFAULT_REGION: c.region, AWS_PAGER: '', TF_DATA_DIR: join(dir, 'terraform-data'), TF_IN_AUTOMATION: '1' };
  // Explicit profiles must not silently inherit another account's environment credentials.
  for (const k of ['AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','AWS_SESSION_TOKEN','AWS_SECURITY_TOKEN','AWS_WEB_IDENTITY_TOKEN_FILE','AWS_ROLE_ARN']) delete env[k];
  return (cmd, args, options = {}) => {
    const r = spawnSync(cmd, args, { env, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, ...options });
    if (r.error || r.status !== 0) throw Error(`${cmd} ${args[0] ?? ''} failed${r.status === null ? '' : ` (${r.status})`}. Inspect the command/permissions; captured output suppressed to protect secrets.`);
    return r.stdout ?? '';
  };
}
export function awsClient(run, region) {
  return (args, otherRegion = region) => JSON.parse(run('aws', [...args, '--region', otherRegion, '--output', 'json', '--no-cli-pager']) || '{}');
}
export function terraformVariables(c, j) {
  const { expected_account_id, region, lab_id, domain, certificate_arn, alert_email, pilot_emails, monthly_budget_usd } = c;
  return { finance_test_enabled:c.finance_test===true,realtime_enabled:c.realtime===true,livekit_url:c.livekit_url??'',expo_push_enabled:c.expo_push===true,email_provider:c.email_provider ?? 'ses',email_from:c.email_from ?? c.ses_from,expected_account_id, region, lab_id, domain, certificate_arn, alert_email, pilot_emails, monthly_budget_usd, image_digest: j.image_digest ?? '', migration_image_digest: j.migration_image_digest ?? '', service_enabled: j.service_enabled === true };
}
export function rememberState(state, journal) {
  const strings = [];
  const walk = value => {
    if (typeof value === 'string') strings.push(value);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(state);
  journal.observed = [...new Set([...(journal.observed ?? []), ...strings.filter(s => s.startsWith('arn:aws:') || /^vpc-[a-f0-9]+$/.test(s))])];
}

export function cloudflare(c, token, transport = fetch) {
  if (!token) throw Error('CLOUDFLARE_API_TOKEN is required (DNS Edit and Zone Read for this zone only).');
  const request = async (path, method = 'GET', body) => {
    const r = await transport(`https://api.cloudflare.com/client/v4/zones/${c.cloudflare_zone_id}${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: globalThis.AbortSignal.timeout(30000),
    });
    const data = await r.json();
    if (!r.ok || !data.success) throw Error(`Cloudflare ${method} failed (${r.status}); no success assumed. Check token scope and retry.`);
    if (data.result_info?.total_pages > 1) throw Error('Unexpected DNS pagination; refusing incomplete ownership check.');
    return data.result;
  };
  const marker = `dvqb-lab:${c.expected_account_id}:${c.lab_id}`;
  const records = async () => {
    const zone = await request('');
    if (zone.name !== c.domain) throw Error('Cloudflare zone does not match configured domain.');
    const groups = {};
    for (const key of ['app','admin','api']) {
      const name = `${key}.${c.domain}`;
      const rows = await request(`/dns_records?name=${encodeURIComponent(name)}&per_page=100`);
      if (rows.length > 1 || rows.some(r => r.type !== 'CNAME' || r.comment !== marker || r.proxied)) throw Error(`DNS ${name} is not owned by this lab or has proxy enabled. No overwrite allowed.`);
      groups[key] = rows[0];
    }
    return groups;
  };
  return {
    preflight: records,
    async sync(targets, remove = false) {
      const current = await records(); // Check all names before any mutation.
      for (const key of ['app','admin','api']) {
        const row = current[key];
        if (remove) { if (row) await request(`/dns_records/${row.id}`, 'DELETE'); continue; }
        const target = targets[key];
        if (!/^[a-z0-9]+\.cloudfront\.net$/.test(target ?? '')) throw Error('Invalid CloudFront DNS output.');
        const body = { type: 'CNAME', name: `${key}.${c.domain}`, content: target, ttl: 300, proxied: false, comment: marker };
        await request(`/dns_records${row ? `/${row.id}` : ''}`, row ? 'PUT' : 'POST', body);
      }
    },
  };
}

// Separate service enumerations deliberately supplement Terraform state and tags.
// AWS CLI automatically paginates; any denied/failed enumeration aborts the audit.
export function auditResources(c, aws, journal) {
  const name = `dvqb-lab-${c.lab_id}`;
  const owned = x => typeof x === 'string' && (x === name || x.startsWith(name + '-') || x.startsWith(name + '/') || x.startsWith(`/ecs/${name}`) || x.startsWith(`/aws/rds/instance/${name}/`));
  const found = [];
  const add = (kind, rows, id, matches = x => owned(id(x))) => { for (const r of rows ?? []) if (matches(r)) found.push({ kind, id: id(r) }); };
  add('RDS', aws(['rds','describe-db-instances']).DBInstances, x => x.DBInstanceIdentifier);
  add('RDS snapshot', aws(['rds','describe-db-snapshots','--snapshot-type','manual']).DBSnapshots, x => x.DBSnapshotIdentifier, x => owned(x.DBInstanceIdentifier) || owned(x.DBSnapshotIdentifier));
  add('RDS retained backup', aws(['rds','describe-db-instance-automated-backups']).DBInstanceAutomatedBackups, x => x.DBInstanceAutomatedBackupsArn, x => owned(x.DBInstanceIdentifier));
  add('ALB', aws(['elbv2','describe-load-balancers']).LoadBalancers, x => x.LoadBalancerArn, x => owned(x.LoadBalancerName));
  add('S3', aws(['s3api','list-buckets']).Buckets, x => x.Name);
  add('ECR', aws(['ecr','describe-repositories']).repositories, x => x.repositoryName);
  const vpcs = aws(['ec2','describe-vpcs']).Vpcs ?? [];
  const ids = new Set((journal.observed ?? []).filter(s => s.startsWith('vpc-')));
  for (const v of vpcs) if (v.Tags?.some(t => t.Key === 'LabId' && t.Value === c.lab_id) && v.Tags?.some(t => t.Key === 'Project' && t.Value === 'dvqb')) ids.add(v.VpcId);
  add('VPC', vpcs, x => x.VpcId, x => ids.has(x.VpcId));
  add('ENI', aws(['ec2','describe-network-interfaces']).NetworkInterfaces, x => x.NetworkInterfaceId, x => ids.has(x.VpcId));
  add('Elastic IP', aws(['ec2','describe-addresses']).Addresses, x => x.AllocationId, x => x.Tags?.some(t => t.Key === 'LabId' && t.Value === c.lab_id));
  const clusters = aws(['ecs','list-clusters']).clusterArns ?? [];
  for (const arn of clusters.filter(x => owned(x.split('/').at(-1)))) {
    found.push({ kind: 'ECS cluster', id: arn });
    for (const status of ['RUNNING','PENDING']) add('ECS task', aws(['ecs','list-tasks','--cluster',arn,'--desired-status',status]).taskArns, x => x, () => true);
  }
  add('CloudFront', aws(['cloudfront','list-distributions']).DistributionList?.Items, x => x.Id, x => owned(x.Comment) || x.Aliases?.Items?.some(a => ['app','admin','api'].some(k => a === `${k}.${c.domain}`)));
  const vpcOrigins = manualPages(marker => aws(['cloudfront','list-vpc-origins',...(marker ? ['--marker',marker] : [])]).VpcOriginList, 'Items', 'NextMarker', 'IsTruncated');
  add('VPC origin', vpcOrigins, x => x.Id, x => owned(x.Name));
  for (const region of new Set([c.region, 'us-east-1'])) {
    add('Log group', aws(['logs','describe-log-groups'], region).logGroups, x => x.logGroupName);
    add('Secret', aws(['secretsmanager','list-secrets','--include-planned-deletion'], region).SecretList, x => x.ARN, x => owned(x.Name) || journal.observed?.includes(x.ARN) || (x.Tags?.some(t => t.Key === 'LabId' && t.Value === c.lab_id) && x.Tags?.some(t => t.Key === 'Project' && t.Value === 'dvqb')));
    add('Alarm', aws(['cloudwatch','describe-alarms'], region).MetricAlarms, x => x.AlarmName);
    add('SNS', aws(['sns','list-topics'], region).Topics, x => x.TopicArn, x => owned(x.TopicArn.split(':').at(-1)));
    add('Tagged resource', aws(['resourcegroupstaggingapi','get-resources','--tag-filters', JSON.stringify([{ Key:'Project', Values:['dvqb'] }, { Key:'LabId', Values:[c.lab_id] }])], region).ResourceTagMappingList, x => x.ResourceARN, () => true);
  }
  const webAcls = manualPages(marker => aws(['wafv2','list-web-acls','--scope','CLOUDFRONT',...(marker ? ['--next-marker',marker] : [])], 'us-east-1'), 'WebACLs', 'NextMarker');
  add('WAF', webAcls, x => x.ARN, x => owned(x.Name));
  add('Budget', aws(['budgets','describe-budgets','--account-id',c.expected_account_id]).Budgets, x => x.BudgetName);
  return found;
}

export function manualPages(fetchPage, items, next, truncated) {
  const rows = [], seen = new Set(); let marker;
  do {
    const page = fetchPage(marker);
    if (!page || (page[items] !== undefined && !Array.isArray(page[items]))) throw Error('Invalid audit response; scan incomplete.');
    rows.push(...(page[items] ?? []));
    if (truncated && page[truncated] && !page[next]) throw Error('Incomplete audit page without continuation marker.');
    marker = page[next];
    if (marker && seen.has(marker)) throw Error('Repeated audit continuation marker.');
    if (marker) seen.add(marker);
  } while (marker);
  return rows;
}

export function abortLabUploads(c, aws) {
  const expected = new Set(['assets','web','admin'].map(k => `dvqb-lab-${c.lab_id}-${k}-${c.expected_account_id}-${c.region}`));
  const buckets = aws(['s3api','list-buckets']).Buckets ?? [];
  for (const { Name: bucket } of buckets.filter(b => expected.has(b.Name))) {
    const owner = ['--expected-bucket-owner',c.expected_account_id];
    const tags = aws(['s3api','get-bucket-tagging','--bucket',bucket,...owner]).TagSet ?? [];
    if (![['Project','dvqb'],['Environment','lab'],['LabId',c.lab_id]].every(([k,v]) => tags.some(t => t.Key === k && t.Value === v))) throw Error('Refusing multipart cleanup on a bucket without exact lab ownership tags.');
    let keyMarker, uploadMarker; const seen = new Set(), uploads = [];
    do {
      const page = aws(['s3api','list-multipart-uploads','--bucket',bucket,...owner,'--no-paginate',...(keyMarker ? ['--key-marker',keyMarker,'--upload-id-marker',uploadMarker] : [])]);
      uploads.push(...(page.Uploads ?? []));
      if (!page.IsTruncated) break;
      keyMarker = page.NextKeyMarker; uploadMarker = page.NextUploadIdMarker;
      const marker = JSON.stringify([keyMarker,uploadMarker]);
      if (!keyMarker || !uploadMarker || seen.has(marker)) throw Error('Incomplete multipart upload scan.');
      seen.add(marker);
    } while (keyMarker);
    for (const u of uploads) aws(['s3api','abort-multipart-upload','--bucket',bucket,'--key',u.Key,'--upload-id',u.UploadId,...owner]);
  }
}

export function assertCleanState(dir, journal) {
  if (journal.observed?.length && !existsSync(join(dir, 'terraform.tfstate'))) throw Error('State is missing for an existing lab. Restore the encrypted state backup; use status --live to inspect, never initialize over it.');
}

export function assertStateIdentity(c, state, journal, afterAuthorizedApply = false) {
  if (journal.lineage && state.lineage !== journal.lineage) throw Error('Terraform state lineage changed. Refusing copied or replaced state.');
  const d = state.outputs?.deployment?.value;
  if (d && (d.lab_id !== c.lab_id || d.account_id !== c.expected_account_id || d.region !== c.region || d.api_origin !== `https://api.${c.domain}`)) throw Error('State deployment belongs to another environment.');
  let owned = false;
  for (const resource of state.resources ?? []) {
    if (resource.mode !== 'managed') continue;
    for (const instance of resource.instances ?? []) {
      const a = instance.attributes ?? {}, tags = a.tags_all ?? a.tags;
      if (tags && Object.keys(tags).length) {
        if (tags.Project !== 'dvqb' || tags.Environment !== 'lab' || tags.LabId !== c.lab_id) throw Error('State contains resources outside the selected disposable lab.');
        owned = true;
      }
      for (const key of ['name','identifier','bucket','family']) if (typeof a[key] === 'string' && a[key].startsWith('dvqb-') && !(a[key] === `dvqb-lab-${c.lab_id}` || a[key].startsWith(`dvqb-lab-${c.lab_id}-`) || a[key].startsWith(`dvqb-lab-${c.lab_id}/`))) throw Error('Foreign resource name in lab state.');
      if (typeof a.arn === 'string' && /^arn:aws:[^:]+:[^:]*:\d{12}:/.test(a.arn) && a.arn.split(':')[4] !== c.expected_account_id) throw Error('Foreign AWS account in state.');
    }
  }
  const managed = (state.resources ?? []).filter(r => r.mode === 'managed');
  const onlyOriginToken = managed.every(r => !r.module && r.type === 'random_password' && r.name === 'origin');
  // A hard-kill can occur before the first post-apply checkpoint. Resume only the
  // exact local random resource after the pre-apply intent was durably recorded;
  // this exception can never authorize destruction of an AWS resource.
  const recordedFirstApply = journal.intent === 'up' && journal.phase === 'creating';
  if (managed.length && !owned && !journal.lineage && !((afterAuthorizedApply || recordedFirstApply) && onlyOriginToken)) throw Error('Unrecognized state without lab ownership evidence. Restore the matching journal.');
}
