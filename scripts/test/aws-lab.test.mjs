import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { validateConfig, privateJson, lock, requireConfirmation, assertIdentity, assertJournal, cleanEnvironment, terraformVariables, cloudflare, auditResources, rememberState, assertCleanState, manualPages, abortLabUploads } from '../aws/lab-core.mjs';
import { parseArgs, validatePrerequisites } from '../aws/lab.mjs';

const config = { lab_id:'learn', expected_account_id:'123456789012', region:'ap-southeast-1', domain:'iimissher.com', profile:'dvqb-lab', cloudflare_zone_id:'a'.repeat(32), certificate_arn:'arn:aws:acm:us-east-1:123456789012:certificate/00000000-0000-0000-0000-000000000000', ses_from:'owner@example.com', alert_email:'owner@example.com', pilot_emails:['owner@example.com'], monthly_budget_usd:20 };
const journal = () => ({ account:config.expected_account_id,lab_id:config.lab_id,region:config.region,domain:config.domain,observed:[] });

test('lab guards reject wrong identity, unsafe config, implicit destruction and state loss', () => {
  assert.deepEqual(validateConfig(config), config);
  for (const patch of [{lab_id:'../pilot'}, {expected_account_id:'1'}, {region:'us-west-2'}, {domain:'https://iimissher.com'}, {profile:'--endpoint-url'}, {certificate_arn:config.certificate_arn.replace('us-east-1','ap-southeast-1')}, {pilot_emails:[]}, {monthly_budget_usd:0}, {AWS_SECRET_ACCESS_KEY:'never-store'}]) assert.throws(() => validateConfig({...config,...patch}));
  assert.throws(() => assertIdentity(config,{Account:'000000000000',Arn:'arn:aws:iam::000000000000:role/operator'}));
  assert.throws(() => assertIdentity(config,{Account:config.expected_account_id,Arn:`arn:aws:iam::${config.expected_account_id}:root`}));
  assertIdentity(config,{Account:config.expected_account_id,Arn:`arn:aws:sts::${config.expected_account_id}:assumed-role/operator/user`});
  assert.throws(() => assertJournal(config,{...journal(),domain:'another.com'}));
  assert.throws(() => requireConfirmation(config,{}));
  assert.throws(() => requireConfirmation(config,{confirm:'123456789012/learn'},true));
  requireConfirmation(config,{confirm:'123456789012/learn','accept-data-loss':true},true);
  assert.throws(() => assertCleanState('/unavailable',{observed:['vpc-0123']}));
  assert.throws(() => parseArgs(['down','--yes']));
  assert.throws(() => parseArgs(['down','--lab','learn','--lab','other']));
  assert.equal(parseArgs(['up','--lab','learn']).options.apply,undefined);
});

test('lab local journal is private and blocks concurrent operations without deleting state', () => {
  const dir=mkdtempSync(join(tmpdir(),'dvqb-lab-test-'));
  try {
    const release=lock(dir); assert.throws(()=>lock(dir));
    privateJson(join(dir,'journal.json'),journal());
    assert.equal(statSync(join(dir,'journal.json')).mode & 0o777,0o600);
    release();const release2=lock(dir);release2();
    const j=journal();rememberState({nested:{secret:'arn:aws:secretsmanager:ap-southeast-1:123456789012:secret:rds!db-test',vpc:'vpc-012abc',password:'do-not-record'}},j);
    assert.equal(j.observed.length,2);assert.ok(!JSON.stringify(j).includes('do-not-record'));
    const env=cleanEnvironment({TF_VAR_lab_id:'pilot',TF_CLI_ARGS_apply:'-auto-approve',TF_WORKSPACE:'pilot',AWS_ENDPOINT_URL_STS:'https://attacker',PATH:'/bin'});
    assert.deepEqual(env,{PATH:'/bin'});
    assert.equal(terraformVariables(config,j).service_enabled,false);
    assert.equal(terraformVariables(config,j).image_digest,'');
  } finally {rmSync(dir,{recursive:true,force:true});}
});

function fakeCloudflare(rows={}) {
  const calls=[];
  const transport=async(url,options)=>{
    const u=new URL(url);calls.push({url:u, ...options});
    let result;
    if(u.pathname.endsWith(config.cloudflare_zone_id))result={name:config.domain};
    else if(options.method==='GET')result=rows[u.searchParams.get('name')]??[];
    else result={id:'record'};
    return {ok:true,status:200,json:async()=>({success:true,result})};
  };
  return {calls,client:cloudflare(config,'test-token',transport)};
}
test('lab DNS checks all names before mutations and never overwrites unrelated records', async () => {
  const targets={app:'dapp.cloudfront.net',admin:'dadmin.cloudfront.net',api:'dapi.cloudfront.net'};
  const blocked=fakeCloudflare({'api.iimissher.com':[{id:'existing',type:'CNAME',comment:'someone else',proxied:false}]});
  await assert.rejects(blocked.client.sync(targets));
  assert.equal(blocked.calls.filter(x=>x.method!=='GET').length,0);
  const ok=fakeCloudflare();await ok.client.sync(targets);
  const writes=ok.calls.filter(x=>x.method==='POST');assert.equal(writes.length,3);
  for(const w of writes){const b=JSON.parse(w.body);assert.equal(b.proxied,false);assert.equal(b.comment,'dvqb-lab:123456789012:learn');assert.ok(!b.name.startsWith('www.'));}
  const owned=fakeCloudflare({'app.iimissher.com':[{id:'ours',type:'CNAME',comment:'dvqb-lab:123456789012:learn',proxied:false}]});
  await owned.client.sync({},true);assert.equal(owned.calls.filter(x=>x.method==='DELETE').length,1);
  await assert.rejects(cloudflare(config,'token',async()=>({ok:false,status:403,json:async()=>({success:false})})).preflight());
});

test('lab cleanup audit detects untagged backups, managed secrets and global remnants and fails on denied scans', () => {
  const seen=[];const j=journal();j.observed=['vpc-0123','arn:aws:secretsmanager:ap-southeast-1:123456789012:secret:rds!db-abc'];
  const aws=(args,region)=>{
    seen.push([args,region]);const key=args.slice(0,2).join(' ');
    return ({
      'rds describe-db-snapshots':{DBSnapshots:[{DBInstanceIdentifier:'dvqb-lab-learn',DBSnapshotIdentifier:'untagged-backup'},{DBInstanceIdentifier:'dvqb-pilot',DBSnapshotIdentifier:'leave-alone'}]},
      'secretsmanager list-secrets':{SecretList:[{Name:'rds!db-abc',ARN:j.observed[1]}]},
      'cloudfront list-vpc-origins':{VpcOriginList:{Items:[{Name:'dvqb-lab-learn',Id:'vo-test'}]}},
      'cloudfront list-distributions':{DistributionList:{Items:[{Id:'dist',Aliases:{Items:['api.iimissher.com']}}]}},
      'ec2 describe-network-interfaces':{NetworkInterfaces:[{VpcId:'vpc-0123',NetworkInterfaceId:'eni-test'}]},
      'wafv2 list-web-acls':{WebACLs:[{Name:'dvqb-lab-learn',ARN:'waf-global'}]},
    })[key]??{};
  };
  const result=auditResources(config,aws,j);
  for(const kind of ['RDS snapshot','Secret','VPC origin','CloudFront','ENI','WAF'])assert.ok(result.some(x=>x.kind===kind),kind);
  assert.ok(!result.some(x=>x.id==='leave-alone'));
  assert.ok(seen.some(([a,r])=>a[0]==='wafv2'&&r==='us-east-1'));
  assert.throws(()=>auditResources(config,()=>{throw Error('AccessDenied');},j));
});

test('lab prerequisite checks require issued matching certificate and verified SES identities', () => {
  const aws=(args)=>({
    'sts':{Account:config.expected_account_id,Arn:'arn:aws:sts::123456789012:assumed-role/operator/user'},
    'acm':{Certificate:{Status:'ISSUED',SubjectAlternativeNames:['*.iimissher.com']}},
    'sesv2':args[1]==='get-account'?{SendingEnabled:true}:{VerifiedForSendingStatus:true},
  })[args[0]];
  validatePrerequisites(config,aws);
  assert.throws(()=>validatePrerequisites(config,args=>args[0]==='acm'?{Certificate:{Status:'PENDING_VALIDATION'}}:aws(args)));
  assert.throws(()=>validatePrerequisites(config,args=>args[0]==='sesv2'?{VerifiedForSendingStatus:false}:aws(args)));
});

test('lab edge removes spoofed forwarding and origin credentials while preserving auth and application headers', () => {
  const source=readFileSync(new URL('../../infra/aws/lab/api-headers.js',import.meta.url),'utf8');
  const context=vm.createContext({});vm.runInContext(source,context);
  const request={headers:{'x-forwarded-for':{value:'attacker, other'},forwarded:{value:'for=attacker'},'x-forwarded-host':{value:'evil.test'},'x-dvqb-origin':{value:'attacker'},authorization:{value:'Bearer sample'},'x-admin-session':{value:'session'},'x-forwarded-proto':{value:'http'}}};
  const result=context.handler({request,viewer:{ip:'2001:db8::2'}});
  assert.equal(result.headers['x-forwarded-for'].value,'2001:db8::2');
  for(const k of ['forwarded','x-forwarded-host','x-dvqb-origin'])assert.equal(result.headers[k],undefined);
  assert.equal(result.headers.authorization.value,'Bearer sample');
  assert.equal(result.headers['x-admin-session'].value,'session');
  assert.equal(result.headers['x-forwarded-proto'].value,'http'); // Edge must not write AWS-disallowed header; backend normalizes it.
});

test('lab audit follows VPC origin and WAF continuation markers and rejects incomplete pagination', () => {
  const seen=[];
  const aws=(args,region)=>{
    seen.push([args,region]);
    if(args[0]==='cloudfront'&&args[1]==='list-vpc-origins')return {VpcOriginList:args.includes('--marker')?{Items:[{Name:'dvqb-lab-learn',Id:'late-origin'}],IsTruncated:false}:{Items:[],IsTruncated:true,NextMarker:'page-two'}};
    if(args[0]==='wafv2')return args.includes('--next-marker')?{WebACLs:[{Name:'dvqb-lab-learn',ARN:'late-waf'}]}:{WebACLs:[],NextMarker:'waf-two'};
    return {};
  };
  const rows=auditResources(config,aws,journal());
  assert.ok(rows.some(x=>x.id==='late-origin'));assert.ok(rows.some(x=>x.id==='late-waf'));
  assert.ok(seen.some(([a,r])=>a.includes('--next-marker')&&r==='us-east-1'));
  assert.throws(()=>manualPages(()=>({Items:[],IsTruncated:true}),'Items','NextMarker','IsTruncated'));
  assert.throws(()=>manualPages(()=>({Items:[],NextMarker:'same'}),'Items','NextMarker'));
  assert.throws(()=>manualPages(()=>undefined,'Items','NextMarker'));
});

test('lab multipart cleanup only aborts uploads in exact account buckets with matching lab tags', () => {
  const bucket='dvqb-lab-learn-assets-123456789012-ap-southeast-1';const calls=[];
  const aws=args=>{
    calls.push(args);
    if(args[1]==='list-buckets')return {Buckets:[{Name:bucket},{Name:'dvqb-pilot-assets-123456789012-ap-southeast-1'}]};
    if(args[1]==='get-bucket-tagging')return {TagSet:[{Key:'Project',Value:'dvqb'},{Key:'Environment',Value:'lab'},{Key:'LabId',Value:'learn'}]};
    if(args[1]==='list-multipart-uploads')return args.includes('--key-marker')?{Uploads:[{Key:'second',UploadId:'two'}],IsTruncated:false}:{Uploads:[{Key:'first',UploadId:'one'}],IsTruncated:true,NextKeyMarker:'first',NextUploadIdMarker:'one'};
    return {};
  };
  abortLabUploads(config,aws);
  const aborted=calls.filter(a=>a[1]==='abort-multipart-upload');assert.equal(aborted.length,2);
  for(const a of aborted){assert.equal(a[a.indexOf('--bucket')+1],bucket);assert.equal(a[a.indexOf('--expected-bucket-owner')+1],config.expected_account_id);}
  let writes=0;
  assert.throws(()=>abortLabUploads(config,args=>{
    if(args[1]==='list-buckets')return {Buckets:[{Name:bucket}]};
    if(args[1]==='get-bucket-tagging')return {TagSet:[{Key:'LabId',Value:'another'}]};
    writes++;return {};
  }));assert.equal(writes,0);
});


test('lab supports explicit Resend configuration and backward compatible SES sender',()=>{
 const resend={...config,ses_from:undefined,email_from:'no-reply@example.com',email_provider:'resend'};
 assert.equal(validateConfig(resend),resend);
 assert.equal(terraformVariables(resend,journal()).email_provider,'resend');
 assert.equal(terraformVariables(resend,journal()).email_from,'no-reply@example.com');
 assert.equal(terraformVariables(config,journal()).email_from,config.ses_from);
 assert.equal(terraformVariables(config,journal()).email_provider,'ses');
 for(const patch of [{email_provider:'unknown'},{email_from:'invalid'},{ses_from:'other@example.com'},{RESEND_API_KEY:'re_private'}])assert.throws(()=>validateConfig({...resend,...patch}));
 const calls=[];
 validatePrerequisites(resend,args=>{calls.push(args[0]);if(args[0]==='sts')return {Account:config.expected_account_id,Arn:'operator'};if(args[0]==='acm')return {Certificate:{Status:'ISSUED',SubjectAlternativeNames:['*.'+config.domain]}};throw Error('Unexpected provider call');});
 assert.deepEqual(calls,['sts','acm']);
});

test('lab communications config requires explicit singleton, owned provider URL and Expo project',()=>{
 const good={...config,realtime:true,livekit_url:'wss://owned.livekit.cloud',expo_push:true,expo_project_id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'};
 assert.equal(validateConfig(good),good);assert.equal(terraformVariables(good,journal()).realtime_enabled,true);assert.equal(terraformVariables(good,journal()).expo_push_enabled,true);
 for(const patch of [{realtime:false},{realtime:'true'},{livekit_url:'wss://attacker.example'},{livekit_url:'wss://owned.livekit.cloud/?x=1'},{expo_project_id:'bad'},{EXPO_ACCESS_TOKEN:'private'},{LIVEKIT_API_SECRET:'private'}])assert.throws(()=>validateConfig({...good,...patch}));
});

test('lab Expo config overrides only public project identity and rejects malformed IDs',async()=>{
 const {createRequire}=await import('node:module');const require=createRequire(import.meta.url);const configure=require('../../apps/mobile/app.config.js');
 const before=process.env.EXPO_PUBLIC_EAS_PROJECT_ID,base={name:'DEMO',extra:{eas:{projectId:'original'},existing:true}};
 try{
  delete process.env.EXPO_PUBLIC_EAS_PROJECT_ID;assert.equal(configure({config:base}),base);
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';const output=configure({config:base});assert.equal(output.extra.eas.projectId,process.env.EXPO_PUBLIC_EAS_PROJECT_ID);assert.equal(output.extra.existing,true);assert.equal(base.extra.eas.projectId,'original');
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID='not-a-project';assert.throws(()=>configure({config:base}));
 }finally{if(before===undefined)delete process.env.EXPO_PUBLIC_EAS_PROJECT_ID;else process.env.EXPO_PUBLIC_EAS_PROJECT_ID=before;}
});

test('lab finance capability is explicitly boolean and reaches only the disposable root',()=>{
 assert.equal(terraformVariables(validateConfig({...config,finance_test:true}),journal()).finance_test_enabled,true);
 assert.equal(terraformVariables(config,journal()).finance_test_enabled,false);
 for(const value of ['1',1,null])assert.throws(()=>validateConfig({...config,finance_test:value}));
 assert.throws(()=>validateConfig({...config,FINANCE_TEST_SECRET:'never-store'}));
});
