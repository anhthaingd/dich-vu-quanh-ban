import { SNSClient } from '@aws-sdk/client-sns';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { S3Client } from '@aws-sdk/client-s3';
import { SESv2Client } from '@aws-sdk/client-sesv2';
import { config } from '../../src/config/environment.js';
import { S3Assets, sesTransport, cloudTransport } from '../../src/integrations/cloud.js';
import { connectionOptions } from '../../src/database/connection.js';
import { LocalMessages } from '../../src/integrations/local-messages.js';
import { AuthService } from '../../src/modules/auth/auth.service.js';
import type { Pool } from 'pg';
const cloud={NODE_ENV:'production',CLOUD_PILOT:'1',DATABASE_URL:'postgresql://dvqb_app:secret@db.example/dvqb',DATABASE_CA_FILE:'/app/rds-ca.pem',CURSOR_SECRET:'c'.repeat(48),AUTH_SECRET:'a'.repeat(48),MESSAGE_SECRET:'m'.repeat(48),ADMIN_SECRET:'s'.repeat(48),PUBLIC_API_ORIGIN:'https://api.example.com',CORS_ORIGIN:'https://app.example.com,https://admin.example.com',PILOT_EMAILS:'owner@example.com',ASSET_BUCKET:'private-assets',SES_FROM:'noreply@example.com'};
test('cloud config enables only reviewed adapters and fails closed on unsafe combinations',()=>{
 const valid=config(cloud);assert.equal(valid.trustProxy,true);assert.ok(valid.localAssets?.store);assert.equal(valid.sesFrom,cloud.SES_FROM);assert.equal(valid.finance,undefined);assert.equal(valid.calls,undefined);assert.equal(valid.realtimeEnabled,false);
 for(const change of [{CLOUD_PILOT:''},{NODE_ENV:'development'},{DATABASE_CA_FILE:''},{AUTH_SECRET:''},{AUTH_SECRET:cloud.CURSOR_SECRET},{PUBLIC_API_ORIGIN:'http://api.example.com'},{PUBLIC_API_ORIGIN:'https://api.example.com/path'},{CORS_ORIGIN:'*'},{CORS_ORIGIN:''},{PILOT_EMAILS:''},{PILOT_EMAILS:'+84900000000'},{ASSET_BUCKET:''},{SES_FROM:'bad'},{ADMIN_SECRET:'short'},{MESSAGE_SECRET:cloud.AUTH_SECRET},{REALTIME_ENABLED:'1'},{LOCAL_MESSAGES:'1'},{LOCAL_ASSET_DIRECTORY:'/tmp'},{ADMIN_LOCAL_SECRET:'x'.repeat(48)},{FINANCE_LOCAL_SECRET:'x'.repeat(48)},{EXPO_PUSH_ENABLED:'1'}])assert.throws(()=>config({...cloud,...change}),JSON.stringify(change));
});
test('cloud proxy mode only allows reviewed ALB and CloudFront paths in cloud mode',()=>{
 assert.equal(config(cloud).proxyMode,'alb');
 assert.equal(config({...cloud,CLOUD_PROXY_MODE:'alb'}).proxyMode,'alb');
 const lab=config({...cloud,CLOUD_PROXY_MODE:'cloudfront-alb'});
 assert.equal(lab.proxyMode,'cloudfront-alb');assert.equal(lab.trustProxy,true);
 for(const mode of ['2','true','cloudflare','cloudfront',''])assert.throws(()=>config({...cloud,CLOUD_PROXY_MODE:mode}),/proxy mode/);
 const local={DATABASE_URL:'postgresql://localhost/dvqb_test',CURSOR_SECRET:'c'.repeat(48),NODE_ENV:'test'};
 assert.equal(config(local).proxyMode,undefined);assert.equal(config(local).trustProxy,false);
 for(const mode of ['alb','cloudfront-alb'])assert.throws(()=>config({...local,CLOUD_PROXY_MODE:mode}),/proxy mode/);
});
test('database TLS validates server identity and rejects URL overrides',()=>{
 const dir=mkdtempSync(join(tmpdir(),'dvqb-ca-')),file=join(dir,'ca.pem');
 try{writeFileSync(file,'test-ca');const settings=connectionOptions(cloud.DATABASE_URL,file);assert.deepEqual(settings.ssl,{ca:'test-ca',rejectUnauthorized:true});assert.throws(()=>connectionOptions(cloud.DATABASE_URL+'?sslmode=no-verify',file));assert.throws(()=>connectionOptions(cloud.DATABASE_URL,'/does-not-exist'));assert.equal(connectionOptions(cloud.DATABASE_URL).ssl,undefined);}finally{rmSync(dir,{recursive:true});}
});
test('S3 adapter keeps objects private, validates keys, propagates errors and survives a new client instance',async()=>{
 const stored=new Map<string,Buffer>();const sent:Record<string,unknown>[]=[];
 const client={send:async(command:{input:Record<string,unknown>})=>{const i=command.input;sent.push(i);if(i.Body){stored.set(String(i.Key),i.Body as Buffer);return {};}return {Body:stored.has(String(i.Key))?{transformToByteArray:async()=>stored.get(String(i.Key))}:undefined};}} as unknown as S3Client;
 const key='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa.png';await new S3Assets('private',client).put(key,Buffer.from('image'));
 assert.equal((await new S3Assets('private',client).get(key)).toString(),'image');assert.equal(sent[0].ACL,undefined);assert.equal(sent[0].ServerSideEncryption,'AES256');assert.equal(sent[0].Key,'assets/'+key);
 await assert.rejects(()=>new S3Assets('private',client).get('../secret'));await assert.rejects(()=>new S3Assets('private',client).get(key.replace('.png','.raw')));
 await assert.rejects(()=>new S3Assets('private',{send:async()=>{throw Error('unavailable');}} as unknown as S3Client).put(key,Buffer.from('x')));
});
test('SES sends email without demo labels and never sends SMS or swallows provider failures',async()=>{
 const sent:Record<string,unknown>[]=[];const transport=sesTransport('from@example.com',{send:async(c:{input:Record<string,unknown>})=>{sent.push(c.input);}} as unknown as SESv2Client);
 await transport('id',{contact:'owner@example.com',subject:'Verify — DEMO',text:'123456. Chỉ dùng trong DEMO local/test.'});
 assert.deepEqual(sent[0].Destination,{ToAddresses:['owner@example.com']});assert.ok(!JSON.stringify(sent).includes('DEMO'));
 await assert.rejects(()=>transport('id',{contact:'+84900000000',subject:'x',text:'x'}));assert.equal(sent.length,1);
 await assert.rejects(()=>sesTransport('from@example.com',{send:async()=>{throw Error('timeout');}} as unknown as SESv2Client)('id',{contact:'owner@example.com',subject:'x',text:'x'}));
});
test('pilot registration rejects uninvited email before hashing or writing database',async()=>{
 const auth=new AuthService({} as Pool,'a'.repeat(48),['invited@example.com']);await assert.rejects(()=>auth.register('other@example.com','password123','Other'));
});

test('cloud SMS is opt-in, allowlisted, short transactional text and propagates delivery failures',async()=>{
 const sent:Record<string,unknown>[]=[];let emails=0;const sns={send:async(c:{input:Record<string,unknown>})=>{sent.push(c.input);}} as unknown as SNSClient;
 const message={contact:'+84900000001',subject:'OTP',text:'Mã xác minh: 123456. Chỉ dùng trong DEMO local/test.'};
 const transport=cloudTransport('from@example.com',[message.contact],true,async()=>{emails++;},sns);
 await transport('id',message);assert.equal(sent.length,1);assert.ok(String(sent[0].Message).includes('123456'));assert.ok(!String(sent[0].Message).includes('DEMO'));assert.equal(sent[0].PhoneNumber,message.contact);
 await transport('email',{...message,contact:'owner@example.com'});assert.equal(emails,1);
 await assert.rejects(()=>transport('id',{...message,contact:'+84900000002'}));
 await assert.rejects(()=>cloudTransport('from@example.com',[message.contact],false,undefined,sns)('id',message));
 await assert.rejects(()=>cloudTransport('from@example.com',[message.contact],true,undefined,{send:async()=>{throw Error('denied');}} as unknown as SNSClient)('id',message));
 assert.throws(()=>config({...cloud,SMS_ENABLED:'1'}));assert.throws(()=>config({...cloud,PILOT_PHONES:'invalid'}));
 assert.ok(config({...cloud,SMS_ENABLED:'1',PILOT_PHONES:message.contact}).localMessages?.contacts.includes(message.contact));
 assert.ok(!config({...cloud,PILOT_PHONES:message.contact}).localMessages?.contacts.includes(message.contact));
});

test('email lab policy is explicit and isolated; Resend requires its sender and server key',()=>{
 assert.equal(config(cloud).verificationPolicy,'phone');
 const lab={...cloud,CLOUD_PROXY_MODE:'cloudfront-alb',LAB_EMAIL_VERIFICATION:'1',EMAIL_PROVIDER:'resend',EMAIL_FROM:'no-reply@example.com',RESEND_API_KEY:'re_test_only'};
 assert.equal(config(lab).verificationPolicy,'email_lab');assert.deepEqual(config(lab).resend,{from:lab.EMAIL_FROM,apiKey:lab.RESEND_API_KEY});
 for(const change of [{CLOUD_PROXY_MODE:'alb'},{LAB_EMAIL_VERIFICATION:'true'},{EMAIL_PROVIDER:'unknown'},{EMAIL_FROM:''},{RESEND_API_KEY:''}])assert.throws(()=>config({...lab,...change}));
 const local={NODE_ENV:'test',DATABASE_URL:'postgresql://localhost/dvqb_test',CURSOR_SECRET:'c'.repeat(48),LAB_EMAIL_VERIFICATION:'1'};
 assert.equal(config(local).verificationPolicy,'email_lab');
 for(const change of [{DATABASE_URL:'postgresql://remote.example/dvqb_test'},{DATABASE_URL:'postgresql://localhost/dvqb'},{DATABASE_URL:local.DATABASE_URL+'?host=remote.example'},{NODE_ENV:'production'}])assert.throws(()=>config({...local,...change}));
 const phone=new AuthService({} as Pool,'a'.repeat(48)),email=new AuthService({} as Pool,'a'.repeat(48),undefined,'email_lab');
 assert.equal(phone.hasServiceVerification({email_verified:true,phone_verified:false}),false);
 assert.equal(email.hasServiceVerification({email_verified:false,phone_verified:true}),false);
 assert.equal(email.hasServiceVerification({email_verified:true,phone_verified:false}),true);
});

test('Resend sends stable idempotent payloads and rejects SMS, errors and malformed success',async()=>{
 const {resendTransport}=await import('../../src/integrations/cloud.js');
 const calls:RequestInit[]=[],message={contact:'tester@example.com',subject:'Verify — DEMO',text:'123456. Chỉ dùng trong DEMO local/test.'};
 const send=resendTransport('no-reply@example.com','re_test_only',async(url,init)=>{assert.equal(url,'https://api.resend.com/emails');calls.push(init!);return Response.json({id:'accepted'});});
 await send('delivery-1',message);await send('delivery-1',message);
 assert.equal(calls[0].body,calls[1].body);assert.deepEqual(calls[0].headers,calls[1].headers);
 assert.equal((calls[0].headers as Record<string,string>)['Idempotency-Key'],'dvqb-email/delivery-1');
 assert.equal((calls[0].headers as Record<string,string>).Authorization,'Bearer re_test_only');
 assert.ok(!String(calls[0].body).includes('DEMO'));assert.ok(!String(calls[0].body).includes('re_test_only'));
 await assert.rejects(()=>send('sms',{...message,contact:'+84900000001'}));assert.equal(calls.length,2);
 for(const status of [401,403,429,500])await assert.rejects(()=>resendTransport('from@example.com','re_test_only',async()=>Response.json({private:'secret'},{status}))('id',message),/Email provider rejected delivery/);
 for(const value of [{},null,{id:123}])await assert.rejects(()=>resendTransport('from@example.com','re_test_only',async()=>Response.json(value))('id',message),/acknowledge/);
 await assert.rejects(()=>resendTransport('from@example.com','re_test_only',async()=>{throw Error('timeout');})('id',message),/timeout/);
});

test('cloud realtime calls and push require explicit lab singleton and private credentials',()=>{
 const lab={...cloud,CLOUD_PROXY_MODE:'cloudfront-alb',LAB_REALTIME_SINGLETON:'1',REALTIME_ENABLED:'1',LIVEKIT_MODE:'cloud',LIVEKIT_URL:'wss://owned.livekit.cloud',LIVEKIT_API_KEY:'test-key',LIVEKIT_API_SECRET:'l'.repeat(48),LIVEKIT_ROOM_PREFIX:'dvqb-lab-123456789012-learn-call-',EXPO_PUSH_ENABLED:'1',EXPO_ACCESS_TOKEN:'test-expo-token'};
 const settings=config(lab);assert.equal(settings.labRealtime,true);assert.equal(settings.calls?.mode,'cloud');assert.equal(settings.realtimeEnabled,true);assert.equal(settings.push?.accessToken,'test-expo-token');
 for(const patch of [{CLOUD_PROXY_MODE:'alb'},{LAB_REALTIME_SINGLETON:'0'},{LAB_REALTIME_SINGLETON:'true'},{REALTIME_ENABLED:'0'},{LIVEKIT_URL:'wss://attacker.example'},{LIVEKIT_URL:'ws://owned.livekit.cloud'},{LIVEKIT_URL:'wss://owned.livekit.cloud/path'},{LIVEKIT_API_SECRET:''},{LIVEKIT_ROOM_PREFIX:'shared-'},{EXPO_ACCESS_TOKEN:''}])assert.throws(()=>config({...lab,...patch}));
 assert.throws(()=>config({...cloud,LAB_REALTIME_SINGLETON:'1',REALTIME_ENABLED:'1'}));
});

test('lab test finance requires explicit cloud lab mode and a separate persistent secret',()=>{
 const lab={...cloud,CLOUD_PROXY_MODE:'cloudfront-alb',LAB_FINANCE_TEST:'1',FINANCE_TEST_SECRET:'f'.repeat(48)};
 assert.deepEqual(config(lab).finance,{secret:lab.FINANCE_TEST_SECRET,mode:'lab-test'});
 for(const change of [{CLOUD_PROXY_MODE:'alb'},{LAB_FINANCE_TEST:'true'},{FINANCE_TEST_SECRET:''},{FINANCE_TEST_SECRET:'short'},{FINANCE_TEST_SECRET:cloud.ADMIN_SECRET},{FINANCE_LOCAL_SECRET:'z'.repeat(48)}])assert.throws(()=>config({...lab,...change}));
 assert.equal(config({...cloud,CLOUD_PROXY_MODE:'cloudfront-alb'}).finance,undefined);
 assert.throws(()=>config({...cloud,FINANCE_TEST_SECRET:'f'.repeat(48)}));
 assert.throws(()=>config({NODE_ENV:'test',DATABASE_URL:'postgresql://localhost/dvqb_test',CURSOR_SECRET:'c'.repeat(48),LAB_FINANCE_TEST:'1',FINANCE_TEST_SECRET:'f'.repeat(48)}));
});


test('public lab email registration opens email only and preserves closed defaults',()=>{
 const lab={...cloud,CLOUD_PROXY_MODE:'cloudfront-alb',LAB_EMAIL_VERIFICATION:'1',EMAIL_PROVIDER:'resend',EMAIL_FROM:'no-reply@example.com',RESEND_API_KEY:'re_test_only'};
 const closed=config(lab);
 assert.deepEqual(closed.pilotEmails,['owner@example.com']);
 assert.throws(()=>new LocalMessages({} as Pool,closed.localMessages).requireContact('new@example.com'));
 const opened=config({...lab,PUBLIC_EMAIL_REGISTRATION:'1'});
 assert.equal(opened.pilotEmails,undefined);
 const messages=new LocalMessages({} as Pool,opened.localMessages);
 assert.doesNotThrow(()=>messages.requireContact('new@example.com'));
 for(const contact of ['+84900000001','invalid','a@example.com,b@example.com','a@example.com\nBcc: x@example.com'])assert.throws(()=>messages.requireContact(contact));
 assert.deepEqual(config({...lab,PUBLIC_EMAIL_REGISTRATION:'0'}).pilotEmails,closed.pilotEmails);
 for(const patch of [{PUBLIC_EMAIL_REGISTRATION:'true'},{PUBLIC_EMAIL_REGISTRATION:'1',EMAIL_PROVIDER:'ses'},{PUBLIC_EMAIL_REGISTRATION:'1',LAB_EMAIL_VERIFICATION:'0'},{PUBLIC_EMAIL_REGISTRATION:'1',CLOUD_PROXY_MODE:'alb'}])assert.throws(()=>config({...lab,...patch}));
 assert.throws(()=>config({NODE_ENV:'test',DATABASE_URL:'postgresql://localhost/dvqb_test',CURSOR_SECRET:'c'.repeat(48),PUBLIC_EMAIL_REGISTRATION:'1'}));
 // Local test delivery remains explicitly allowlisted unless configured otherwise.
 assert.throws(()=>new LocalMessages({} as Pool,{secret:'m'.repeat(48),mailpit:'',smsDirectory:'',contacts:[]}).requireContact('new@example.com'));
});
