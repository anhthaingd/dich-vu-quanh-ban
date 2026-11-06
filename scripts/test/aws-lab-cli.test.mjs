import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';

// Exercise the actual CLI in a subprocess. Every external executable and fetch
// is replaced; no AWS, Cloudflare, database or real Docker process is contacted.
const root=resolve(import.meta.dirname,'../..');
const cli=join(root,'scripts/aws/lab.mjs');
const fixtureProgram=String.raw`
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { basename, join } from 'node:path';
const dir=process.env.LAB_CLI_FIXTURE;
const file=join(dir,'fixture.json');
const f=JSON.parse(readFileSync(file,'utf8'));
const args=process.argv.slice(2), cmd=basename(process.argv[1]);
appendFileSync(join(dir,'commands.jsonl'),JSON.stringify({cmd,args,hasFinanceSecret:!!process.env.FINANCE_TEST_SECRET,hasResendKey:!!process.env.RESEND_API_KEY,hasMediaSecret:!!process.env.LIVEKIT_API_SECRET,hasPushSecret:!!process.env.EXPO_ACCESS_TOKEN,realtime:process.env.EXPO_PUBLIC_REALTIME_ENABLED,project:process.env.EXPO_PUBLIC_EAS_PROJECT_ID})+'\n');
const save=()=>writeFileSync(file,JSON.stringify(f));
const out=x=>process.stdout.write(JSON.stringify(x));
const fail=()=>{process.stderr.write('simulated failure');process.exit(42);};
if(cmd==='terraform'){
 const a=args.slice(1), action=a[0];
 if(action==='init'){f.state=a.find(x=>x.startsWith('-backend-config=path='))?.slice('-backend-config=path='.length);save();}
 else if(action==='workspace')process.stdout.write('default\n');
 else if(action==='plan'){const p=a.find(x=>x.startsWith('-out=')).slice(5);writeFileSync(p,JSON.stringify({destroy:a.includes('-destroy')}));}
 else if(action==='apply'){
  const p=JSON.parse(readFileSync(a.at(-1),'utf8'));if(p.destroy){f.mediaService=false;save();}
  const state={version:4,lineage:'00000000-0000-0000-0000-000000000123',outputs:{},resources:p.destroy?[]:f.failRandomOnly?[{mode:'managed',type:'random_password',name:'origin',instances:[{attributes:{id:'none',result:'TEST_RANDOM_ONLY'}}]}]:[{mode:'managed',type:'aws_vpc',name:'main',instances:[{attributes:{id:'vpc-123abc',tags:{Project:'dvqb',Environment:'lab',LabId:f.config.lab_id}}}]}]};
  writeFileSync(f.state,JSON.stringify(state));
  if(f.failApply||f.failRandomOnly){f.failApply=false;f.failRandomOnly=false;save();fail();}
  f.created=!p.destroy;save();
 }
 else if(action==='state')process.stdout.write(f.created?'aws_vpc.main\n':'');
 else if(action==='output')out(f.output);
 else if(action==='show')out({values:{root_module:{resources:[]}},resource_changes:[]});
 else fail();
}else if(cmd==='git'){
 if(args[0]==='rev-parse')process.stdout.write('a'.repeat(40)+'\n');
 else if(args[0]!=='status')fail();
}else if(cmd==='aws'){
 const [s,a]=args;
 if(s==='sts')out({Account:f.wrongAccount?'999999999999':f.config.expected_account_id,Arn:'arn:aws:sts::'+f.config.expected_account_id+':assumed-role/test/fixture'});
 else if(s==='acm')out({Certificate:{Status:'ISSUED',SubjectAlternativeNames:['*.'+f.config.domain]}});
 else if(s==='sesv2')out(a==='get-account'?{SendingEnabled:true}:{VerifiedForSendingStatus:true});
 else if(s==='ecr'&&a==='get-login-password')process.stdout.write('TEST_PASSWORD_NOT_A_REAL_CREDENTIAL');
 else if(s==='ecr'&&a==='list-images')out({imageIds:[]});
 else if(s==='ecr'&&a==='describe-images')out({imageDetails:[{imageDigest:'sha256:'+'b'.repeat(64)}]});
 else if(s==='ecs'&&a==='run-task')out({tasks:[{taskArn:'arn:aws:ecs:ap-southeast-1:123456789012:task/test'}]});
 else if(s==='ecs'&&a==='describe-tasks')out({tasks:[{containers:[{name:'ops',exitCode:0}]}]});
 else if(s==='ecs'&&a==='list-clusters'&&f.mediaService)out({clusterArns:['arn:aws:ecs:ap-southeast-1:123456789012:cluster/'+f.output.cluster]});
 else if(s==='ecs'&&a==='list-services'&&f.mediaService)out({serviceArns:['arn:aws:ecs:ap-southeast-1:123456789012:service/'+f.output.service]});
 else if(s==='ecs'&&a==='update-service'&&args.includes('--desired-count')){f.stopped=true;save();out({});}
 else if(s==='ecs'&&a==='describe-services')out({services:[{runningCount:f.failService?0:1,taskDefinition:f.output.api_task,deployments:[{status:'PRIMARY',rolloutState:f.failService?'FAILED':'COMPLETED',taskDefinition:f.rollback?'arn:aws:ecs:ap-southeast-1:123456789012:task-definition/old-api:1':f.output.api_task}]}]});
 else if(s==='secretsmanager'&&a==='get-secret-value')out({SecretString:JSON.stringify({DATABASE_URL:'postgresql://test:TEST_PRIVATE_CANARY@db/dvqb',AUTH_SECRET:'a'.repeat(48),CURSOR_SECRET:'c'.repeat(48),MESSAGE_SECRET:'m'.repeat(48),ADMIN_SECRET:'d'.repeat(48),...(f.financeExisting?{FINANCE_TEST_SECRET:'f'.repeat(48)}:{})})});
 else if(s==='secretsmanager'&&a==='put-secret-value'){const secret=JSON.parse(readFileSync(0,'utf8'));f.financeInjected=secret.FINANCE_TEST_SECRET==='f'.repeat(48);f.resendInjected=secret.RESEND_API_KEY==='re_TEST_FAKE_RESEND_KEY';f.mediaInjected=!!secret.LIVEKIT_API_KEY&&secret.LIVEKIT_API_SECRET===process.env.LIVEKIT_API_SECRET;f.pushInjected=secret.EXPO_ACCESS_TOKEN===process.env.EXPO_ACCESS_TOKEN;save();out({});}
 else if(s==='cloudfront'&&a==='create-invalidation')out({Invalidation:{Id:'test'}});
 else if(s==='cloudfront'&&a==='list-vpc-origins')out({VpcOriginList:{Items:[],IsTruncated:false}});
 else if(s==='wafv2'&&a==='list-web-acls')out({WebACLs:[]});
 else if(f.failAudit&&s==='rds'&&a==='describe-db-instances')fail();
 else out({});
}else if(!['npm','npx','docker'].includes(cmd))fail();
`;
const fetchProgram=String.raw`
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
const dir=process.env.LAB_CLI_FIXTURE;
globalThis.fetch=async(url,options={})=>{
 const f=JSON.parse(readFileSync(join(dir,'fixture.json'),'utf8'));
 appendFileSync(join(dir,'fetch.jsonl'),JSON.stringify({url:String(url),method:options.method??'GET'})+'\n');
 if(String(url).includes('.livekit.cloud/')){
  if(String(url).endsWith('/rtc/validate'))return new Response(f.badMediaPolicy?'success':'requested room does not exist',{status:f.badMediaPolicy?200:404});
  const prefix='dvqb-lab-'+f.config.expected_account_id+'-'+f.config.lab_id+'-call-';
  if(String(url).endsWith('/ListRooms'))return Response.json({rooms:[...(f.mediaDeleted?[]:[{name:prefix+'demo',sid:'RM_TEST'}]),{name:'unrelated-room',sid:'RM_OTHER'}]});
  if(String(url).endsWith('/ListParticipants'))return Response.json({participants:[{identity:'demo-user',sid:'PA_TEST'}]});
  if(String(url).endsWith('/RemoveParticipant'))return Response.json({});
  if(String(url).endsWith('/DeleteRoom')){if(!f.stopped||f.failMediaDelete)return Response.json({code:'unavailable',msg:'test failure'},{status:503});const input=JSON.parse(options.body);if(input.room!==prefix+'demo')throw Error('Unexpected foreign room mutation');f.mediaDeleted=true;writeFileSync(join(dir,'fixture.json'),JSON.stringify(f));return Response.json({});}
  throw Error('Unexpected LiveKit API');
 }
 if(!String(url).startsWith('https://api.cloudflare.com/'))return {ok:true,status:200,json:async()=>({})};
 const u=new URL(url), method=options.method??'GET';
 let result;
 if(u.pathname.endsWith(f.config.cloudflare_zone_id))result={name:f.config.domain};
 else if(method==='GET')result=(f.dns??[]).filter(r=>r.name===u.searchParams.get('name'));
 else if(method==='DELETE'){f.dns=(f.dns??[]).filter(r=>!u.pathname.endsWith(r.id));result={};}
 else{const row={...JSON.parse(options.body),id:u.pathname.split('/').at(-1)==='dns_records'?'test-'+(f.dns??[]).length:u.pathname.split('/').at(-1)};f.dns=[...(f.dns??[]).filter(r=>r.id!==row.id),row];result=row;}
 writeFileSync(join(dir,'fixture.json'),JSON.stringify(f));
 return {ok:true,status:200,json:async()=>({success:true,result})};
};
`;
function setup(t,changes={}){
 const dir=mkdtempSync(join(tmpdir(),'dvqb-lab-cli-'));
 const labId='t'+randomBytes(4).toString('hex'), labDir=join(root,'.local/aws-lab',labId);
 const config={lab_id:labId,expected_account_id:'123456789012',region:'ap-southeast-1',domain:'example.test',profile:'fixture',cloudflare_zone_id:'a'.repeat(32),certificate_arn:'arn:aws:acm:us-east-1:123456789012:certificate/00000000-0000-0000-0000-000000000000',ses_from:'owner@example.test',alert_email:'owner@example.test',pilot_emails:['owner@example.test'],monthly_budget_usd:10,...changes.emailConfig};
 const name='dvqb-lab-'+labId;
 const output={lab_id:labId,name,account_id:config.expected_account_id,region:config.region,cluster:name,service:name+'-api',ops_task:'arn:aws:ecs:ap-southeast-1:123456789012:task-definition/test-ops:1',api_task:'arn:aws:ecs:ap-southeast-1:123456789012:task-definition/test-api:1',subnets:['subnet-123'],security_group:'sg-123',api_origin:'https://api.example.test',repository_url:'123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/'+name+'-api',repository_name:name+'-api',runtime_secret_arn:'arn:aws:secretsmanager:ap-southeast-1:123456789012:secret:'+name+'/runtime-aaaaaa',database_id:name,log_group:'/ecs/'+name,dns_records:{app:'dapp.cloudfront.net',admin:'dadmin.cloudfront.net',api:'dapi.cloudfront.net'},web:{web:{url:'https://app.example.test',bucket:name+'-web',distribution_id:'DWEB'},admin:{url:'https://admin.example.test',bucket:name+'-admin',distribution_id:'DADMIN'}}};
 const fixtureFile=join(dir,'fixture.json');
 writeFileSync(fixtureFile,JSON.stringify({config,output,...changes}));
 const input=join(dir,'config.json');writeFileSync(input,JSON.stringify(config));
 const bin=join(dir,'bin');mkdirSync(bin);
 for(const cmd of ['aws','terraform','docker','git','npm','npx'])writeFileSync(join(bin,cmd),'#!'+process.execPath+'\n'+fixtureProgram,{mode:0o700});
 const preload=join(dir,'fetch.mjs');writeFileSync(preload,fetchProgram);
 const env={...process.env,PATH:bin+':'+process.env.PATH,LAB_CLI_FIXTURE:dir,CLOUDFLARE_API_TOKEN:'TEST_FAKE_TOKEN',GEOAPIFY_API_KEY:'TEST_FAKE_PRIVATE_MAP_KEY',EXPO_PUBLIC_GEOAPIFY_MAPS_KEY:'TEST_FAKE_PUBLIC_MAP_KEY',RESEND_API_KEY:changes.missingResendKey?'':'re_TEST_FAKE_RESEND_KEY',LIVEKIT_API_KEY:'TEST_LIVEKIT_KEY',LIVEKIT_API_SECRET:'TEST_PRIVATE_MEDIA_SECRET_'.repeat(2),EXPO_ACCESS_TOKEN:'TEST_PRIVATE_PUSH_SECRET',FINANCE_TEST_SECRET:'TEST_PRIVATE_ENV_CANARY'};
 // NODE_OPTIONS from the caller must not introduce an unrelated preload.
 delete env.NODE_OPTIONS;
 const invoke=(action,extra=[])=>spawnSync(process.execPath,['--import',preload,cli,action,...(action==='init'?['--config',input]:['--lab',labId]),...extra],{cwd:root,env,encoding:'utf8',timeout:30000});
 const confirm=['--apply','--confirm',config.expected_account_id+'/'+labId];
 const lines=file=>existsSync(join(dir,file))?readFileSync(join(dir,file),'utf8').trim().split('\n').filter(Boolean).map(x=>JSON.parse(x)):[];
 const update=patch=>writeFileSync(fixtureFile,JSON.stringify({...JSON.parse(readFileSync(fixtureFile,'utf8')),...patch}));
 t.after(()=>{rmSync(labDir,{recursive:true,force:true});rmSync(dir,{recursive:true,force:true});});
 const init=invoke('init');assert.equal(init.status,0,init.stderr);
 return {invoke,confirm,config,labDir,fixture:()=>JSON.parse(readFileSync(fixtureFile,'utf8')),commands:()=>lines('commands.jsonl'),requests:()=>lines('fetch.jsonl'),journal:()=>JSON.parse(readFileSync(join(labDir,'journal.json'),'utf8')),update};
}

test('lab CLI rejects a wrong AWS account before Terraform, DNS or deploy mutations',t=>{
 const f=setup(t,{wrongAccount:true});
 const r=f.invoke('up',f.confirm);
 assert.notEqual(r.status,0);assert.match(r.stderr,/Wrong AWS account/);
 assert.deepEqual(f.commands().map(x=>[x.cmd,...x.args.slice(0,2)]),[['aws','sts','get-caller-identity']]);
 assert.equal(f.requests().length,0);
});

test('lab CLI checkpoints partial apply and retries cleanup against the same local state',t=>{
 const f=setup(t,{failApply:true});
 const first=f.invoke('up',f.confirm);assert.notEqual(first.status,0);
 assert.ok(existsSync(join(f.labDir,'terraform.tfstate')));
 assert.ok(f.journal().observed.includes('vpc-123abc'));
 const down=f.invoke('down',[...f.confirm,'--accept-data-loss']);assert.equal(down.status,0,down.stdout+'\n'+down.stderr);
 assert.equal(f.journal().phase,'resources-removed-billing-pending');
 const paths=f.commands().filter(x=>x.cmd==='terraform'&&x.args.includes('init')).map(x=>x.args.find(a=>a.startsWith('-backend-config=path=')));
 assert.equal(new Set(paths).size,1);assert.equal(paths.length,2);
 assert.equal(f.requests().filter(x=>x.method==='POST'||x.method==='PUT').length,0);
});

test('lab CLI does not report cleanup success when an independent resource scan fails',t=>{
 const f=setup(t,{failApply:true});assert.notEqual(f.invoke('up',f.confirm).status,0);
 f.update({failAudit:true});
 const r=f.invoke('down',[...f.confirm,'--accept-data-loss']);
 assert.notEqual(r.status,0);assert.doesNotMatch(r.stdout,/No lab resources found/);
 assert.notEqual(f.journal().phase,'resources-removed-billing-pending');
 assert.ok(existsSync(join(f.labDir,'terraform.tfstate')));
 const before=f.commands().length;
 const blockedUp=f.invoke('up',f.confirm);
 assert.notEqual(blockedUp.status,0);assert.match(blockedUp.stderr,/Cleanup is incomplete/);
 assert.ok(f.commands().slice(before).every(x=>x.cmd==='aws'&&x.args[0]==='sts'));
 // Credentials/secret payloads never appear in captured terminal output.
 assert.doesNotMatch(r.stdout+r.stderr,/TEST_PRIVATE_CANARY|TEST_FAKE_TOKEN|TEST_PASSWORD_NOT_A_REAL_CREDENTIAL/);
 f.update({failAudit:false});assert.equal(f.invoke('down',[...f.confirm,'--accept-data-loss']).status,0);
});

test('lab CLI refuses to initialize over state whose original journal is missing',t=>{
 const f=setup(t,{failApply:true});assert.notEqual(f.invoke('up',f.confirm).status,0);
 rmSync(join(f.labDir,'journal.json'));
 const before=f.commands().length;
 const r=f.invoke('init');assert.notEqual(r.status,0);assert.match(r.stderr,/state has no journal/);
 assert.equal(f.commands().length,before);
 assert.ok(existsSync(join(f.labDir,'terraform.tfstate')));
 assert.ok(!existsSync(join(f.labDir,'journal.json')));
});

test('lab CLI completes mocked deploy before claiming ready and keeps credentials out of logs',t=>{
 const f=setup(t);
 const r=f.invoke('up',f.confirm);assert.equal(r.status,0,r.stdout+'\n'+r.stderr);
 assert.equal(f.journal().phase,'ready');
 const commands=f.commands();
 const stable=commands.findIndex(x=>x.cmd==='aws'&&x.args[0]==='ecs'&&x.args[1]==='describe-services');
 const publish=commands.findIndex(x=>x.cmd==='aws'&&x.args[0]==='s3');
 assert.ok(stable>=0&&publish>stable);
 assert.equal(f.requests().filter(x=>x.method==='POST').length,3);
 assert.ok(f.requests().some(x=>x.url==='https://api.example.test/v1/ready'));
 assert.ok(f.requests().some(x=>x.url==='https://app.example.test'));
 assert.ok(f.requests().some(x=>x.url==='https://admin.example.test'));
 assert.doesNotMatch(r.stdout+r.stderr+JSON.stringify(commands),/TEST_PRIVATE_CANARY|TEST_FAKE_TOKEN|TEST_PASSWORD_NOT_A_REAL_CREDENTIAL|TEST_FAKE_PRIVATE_MAP_KEY/);
});

test('lab CLI can recover a first apply interrupted after only the local random origin token',t=>{
 const f=setup(t,{failRandomOnly:true});assert.notEqual(f.invoke('up',f.confirm).status,0);
 const down=f.invoke('down',[...f.confirm,'--accept-data-loss']);assert.equal(down.status,0,down.stdout+'\n'+down.stderr);
 assert.equal(f.journal().phase,'resources-removed-billing-pending');
});

test('lab CLI recovers hard-killed first apply only for the exact root origin token',t=>{
 for(const variant of ['root-origin','foreign-module','foreign-name']){
  const f=setup(t);
  // Reproduce disk contents after a hard kill: Terraform wrote its first resource,
  // but the parent never ran finally/checkpoint and has not recorded the lineage.
  const j={...f.journal(),intent:'up',phase:'creating'};
  assert.equal(j.lineage,undefined);
  writeFileSync(join(f.labDir,'journal.json'),JSON.stringify(j));
  const state={version:4,lineage:'00000000-0000-0000-0000-000000000123',outputs:{},resources:[{
   mode:'managed',type:'random_password',name:variant==='foreign-name'?'foreign':'origin',
   ...(variant==='foreign-module'?{module:'module.foreign'}:{}),
   instances:[{attributes:{id:'none',result:'TEST_ORIGIN_TOKEN'}}],
  }]};
  writeFileSync(join(f.labDir,'terraform.tfstate'),JSON.stringify(state));
  const before=f.commands().length;
  const down=f.invoke('down',[...f.confirm,'--accept-data-loss']);
  if(variant==='root-origin'){
   assert.equal(down.status,0,down.stdout+'\n'+down.stderr);
   assert.equal(f.journal().phase,'resources-removed-billing-pending');
   assert.equal(f.journal().lineage,state.lineage);
  }else{
   assert.notEqual(down.status,0,variant);assert.match(down.stderr,/Unrecognized state/);
   assert.ok(f.commands().slice(before).every(x=>x.cmd==='aws'&&x.args[0]==='sts'));
   assert.equal(f.requests().filter(x=>x.method==='DELETE').length,0);
   assert.deepEqual(JSON.parse(readFileSync(join(f.labDir,'terraform.tfstate'),'utf8')),state);
  }
 }
});

test('lab CLI refuses a different lab state before Terraform or DNS mutation',t=>{
 const f=setup(t,{failApply:true});assert.notEqual(f.invoke('up',f.confirm).status,0);
 const statePath=join(f.labDir,'terraform.tfstate'), state=JSON.parse(readFileSync(statePath,'utf8'));
 state.resources[0].instances[0].attributes.tags.LabId='another-lab';
 writeFileSync(statePath,JSON.stringify(state));
 const before=f.commands().length;
 const r=f.invoke('down',[...f.confirm,'--accept-data-loss']);
 assert.notEqual(r.status,0);assert.match(r.stderr,/outside the selected disposable lab/);
 assert.ok(f.commands().slice(before).every(x=>x.cmd==='aws'&&x.args[0]==='sts'));
 assert.equal(f.requests().filter(x=>x.method==='DELETE').length,0);
});

test('lab CLI supports two mocked create cleanup cycles and resumes the same source safely',t=>{
 const f=setup(t);
 for(let cycle=0;cycle<2;cycle++){
  const up=f.invoke('up',f.confirm);assert.equal(up.status,0,up.stderr);assert.equal(f.journal().phase,'ready');
  assert.equal(f.journal().image_digest,'sha256:'+'b'.repeat(64));
  if(cycle===0){const resume=f.invoke('up',f.confirm);assert.equal(resume.status,0,resume.stderr);}
  const down=f.invoke('down',[...f.confirm,'--accept-data-loss']);assert.equal(down.status,0,down.stderr);
  assert.equal(f.journal().phase,'resources-removed-billing-pending');
  assert.equal(f.journal().image_digest,'');assert.equal(f.journal().migration_image_digest,'');assert.equal(f.journal().service_enabled,false);
 }
 assert.equal(f.requests().filter(x=>x.method==='POST').length,6);
 assert.equal(f.requests().filter(x=>x.method==='PUT').length,3);
 assert.equal(f.requests().filter(x=>x.method==='DELETE').length,6);
 const commands=f.commands();
 assert.equal(commands.filter(x=>x.cmd==='aws'&&x.args[0]==='ecs'&&x.args.includes('--force-new-deployment')).length,3);
 const uploads=commands.filter(x=>x.cmd==='aws'&&x.args[0]==='s3');
 assert.equal(uploads.length,12);
 assert.ok(uploads.every(x=>x.args.some(a=>a===`s3://dvqb-lab-${f.config.lab_id}-web`||a===`s3://dvqb-lab-${f.config.lab_id}-admin`||a===`s3://dvqb-lab-${f.config.lab_id}-web/index.html`||a===`s3://dvqb-lab-${f.config.lab_id}-admin/index.html`)));
});

test('lab CLI never publishes DNS or web when ECS service rollout is unsuccessful',t=>{
 const f=setup(t,{failService:true});
 const r=f.invoke('up',f.confirm);assert.notEqual(r.status,0);assert.match(r.stderr,/deployment|service|API/);
 assert.ok(f.commands().some(x=>x.cmd==='aws'&&x.args[0]==='ecs'&&x.args[1]==='describe-services'));
 assert.ok(!f.commands().some(x=>x.cmd==='npx'||(x.cmd==='aws'&&x.args[0]==='s3')));
 assert.equal(f.requests().filter(x=>x.method==='POST'||x.method==='PUT').length,0);
 assert.notEqual(f.journal().phase,'ready');
 assert.doesNotMatch(r.stdout+r.stderr,/TEST_PRIVATE_CANARY|TEST_FAKE_TOKEN|TEST_PASSWORD_NOT_A_REAL_CREDENTIAL/);
});

test('lab CLI refuses a healthy completed ECS rollback to an older task definition',t=>{
 const f=setup(t,{rollback:true});
 const r=f.invoke('up',f.confirm);assert.notEqual(r.status,0);assert.match(r.stderr,/rollback is not a successful release/);
 assert.ok(f.commands().some(x=>x.cmd==='aws'&&x.args[0]==='ecs'&&x.args[1]==='describe-services'));
 assert.ok(!f.commands().some(x=>x.cmd==='npx'||(x.cmd==='aws'&&x.args[0]==='s3')));
 assert.equal(f.requests().filter(x=>x.method==='POST'||x.method==='PUT').length,0);
 assert.notEqual(f.journal().phase,'ready');
});


test('lab Resend deploy injects private key via stdin, skips SES and strips key from web builds',t=>{
 const f=setup(t,{emailConfig:{email_provider:'resend',email_from:'owner@example.test'}});
 const r=f.invoke('up',f.confirm);assert.equal(r.status,0,r.stderr);
 assert.equal(f.fixture().resendInjected,true);
 assert.ok(!f.commands().some(x=>x.cmd==='aws'&&x.args[0]==='sesv2'));
 for(const call of f.commands().filter(x=>x.cmd==='npx'||x.cmd==='npm'&&x.args[0]==='run'&&x.args[1]==='build'))assert.equal(call.hasResendKey,false);
 for(const value of [r.stdout,r.stderr,JSON.stringify(f.commands()),readFileSync(join(f.labDir,'config.json'),'utf8'),readFileSync(join(f.labDir,'journal.json'),'utf8')])assert.ok(!value.includes('re_TEST_FAKE_RESEND_KEY'));
});
test('lab Resend deploy requires a key before creating cloud resources',t=>{
 const f=setup(t,{emailConfig:{email_provider:'resend',email_from:'owner@example.test'},missingResendKey:true});
 const r=f.invoke('up',f.confirm);assert.notEqual(r.status,0);assert.match(r.stderr,/RESEND_API_KEY/);
 assert.ok(!f.commands().some(x=>x.cmd==='docker'||x.cmd==='terraform'&&x.args.includes('apply')));
 assert.ok(!f.requests().some(x=>x.method!=='GET'));
});

const communications={realtime:true,livekit_url:'wss://owned.livekit.cloud',expo_push:true,expo_project_id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'};
test('lab communications deploy guards provider policy, injects secrets and cleans media after API stop',t=>{
 const f=setup(t,{emailConfig:communications,mediaService:true});
 const up=f.invoke('up',f.confirm);assert.equal(up.status,0,up.stderr);assert.equal(f.fixture().mediaInjected,true);assert.equal(f.fixture().pushInjected,true);
 const builds=f.commands().filter(x=>x.cmd==='npx'||x.cmd==='npm'&&x.args[1]==='build');assert.ok(builds.length);
 for(const b of builds){assert.equal(b.hasMediaSecret,false);assert.equal(b.hasPushSecret,false);assert.equal(b.realtime,'1');assert.equal(b.project,communications.expo_project_id);}
 const down=f.invoke('down',[...f.confirm,'--accept-data-loss']);assert.equal(down.status,0,down.stderr);assert.equal(f.fixture().mediaDeleted,true);
 assert.ok(!JSON.stringify(f.commands()).includes('TEST_PRIVATE_MEDIA_SECRET'));assert.ok(!JSON.stringify(f.journal()).includes('TEST_PRIVATE_PUSH_SECRET'));
});
test('lab communications blocks unsafe media before cloud creation and retains failed cleanup for retry',t=>{
 const f=setup(t,{emailConfig:communications,badMediaPolicy:true,mediaService:true});
 const blocked=f.invoke('up',f.confirm);assert.notEqual(blocked.status,0);assert.match(blocked.stderr,/EXPLICIT_ROOMS_REQUIRED/);assert.ok(!f.commands().some(x=>x.cmd==='terraform'&&x.args.includes('apply')));
 f.update({badMediaPolicy:false});assert.equal(f.invoke('up',f.confirm).status,0);
 f.update({failMediaDelete:true});const failed=f.invoke('down',[...f.confirm,'--accept-data-loss']);assert.notEqual(failed.status,0);assert.equal(f.journal().phase,'cleaning-media');assert.equal(f.journal().intent,'down');
 f.update({failMediaDelete:false});const retry=f.invoke('down',[...f.confirm,'--accept-data-loss']);assert.equal(retry.status,0,retry.stderr);assert.equal(f.journal().phase,'resources-removed-billing-pending');
});

test('lab media-check validates provider policy before any AWS or DNS operation',t=>{
 const f=setup(t,{emailConfig:communications});const result=f.invoke('media-check');assert.equal(result.status,0,result.stderr);assert.equal(f.commands().length,0);assert.equal(f.requests().length,1);assert.ok(f.requests()[0].url.endsWith('/rtc/validate'));
 f.update({badMediaPolicy:true});const denied=f.invoke('media-check');assert.notEqual(denied.status,0);assert.match(denied.stderr,/EXPLICIT_ROOMS_REQUIRED/);assert.equal(f.commands().length,0);
});


test('lab finance deploy preserves the stored test key and strips unrelated finance keys from web builds',t=>{
 const f=setup(t,{emailConfig:{finance_test:true},financeExisting:true});const result=f.invoke('up',f.confirm);assert.equal(result.status,0,result.stderr);
 assert.equal(f.fixture().financeInjected,true);
 const inputs=JSON.parse(readFileSync(join(f.labDir,'inputs.tfvars.json'),'utf8'));assert.equal(inputs.finance_test_enabled,true);assert.ok(!JSON.stringify(inputs).includes('SECRET'));
 const builds=f.commands().filter(x=>x.cmd==='npx'||x.cmd==='npm'&&x.args.includes('build'));assert.ok(builds.length>=2);for(const b of builds)assert.equal(b.hasFinanceSecret,false);
 assert.ok(!JSON.stringify(f.commands()).includes('TEST_PRIVATE_ENV_CANARY'));
});
