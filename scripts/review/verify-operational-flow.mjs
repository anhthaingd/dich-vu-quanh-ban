// One persistent, explicitly synthetic end-to-end job via the real local API.
// Does not import test fixtures or reset any table. Stable request keys prevent duplicates.
import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import assert from 'node:assert/strict';
import {id,requireOperationalTarget} from '../data/operational-model.mjs';
requireOperationalTarget(parseEnv(await readFile('services/api/.env','utf8')));
const c=JSON.parse(await readFile('.local/seed-operational/credentials.json','utf8'));
const path='.local/seed-operational/flow-verification.json';let evidence;try{evidence=JSON.parse(await readFile(path,'utf8'));}catch{evidence={database:'dvqb_local',startedAt:new Date().toISOString(),steps:[]};}
if(evidence.status==='PASS'){console.log('Persistent flow already completed; see flow-verification.json. No business writes repeated.');process.exit(0);}
const base='http://127.0.0.1:3110/v1';
async function request(actor,path,method='GET',body,key=path,expected=200){const r=await fetch(base+path,{method,signal:globalThis.AbortSignal.timeout(20000),headers:{'Content-Type':'application/json',...(actor?{Authorization:'Bearer '+actor.access_token}:{}),'Idempotency-Key':id('live-flow:'+key)},...(body?{body:JSON.stringify(body)}:{})});const value=await r.json();evidence.steps.push({path,method,status:r.status,expected,pass:r.status===expected,at:new Date().toISOString()});await save();assert.equal(r.status,expected,JSON.stringify({path,status:r.status,code:value.code}));return value;}
async function save(){await writeFile(path,JSON.stringify(evidence,null,2),{mode:0o600});}
const login=i=>request(null,'/auth/login','POST',{email:c.accounts[i].email,password:c.password});
const customer=await login(180),owner=await login(0),other=await login(181);
const partner=id('partner:0'),profile=await request(customer,'/partners/'+partner);const skill=profile.skills.find(s=>profile.service_modes.some(m=>m.skill_id===s.id&&m.modes.includes('at_customer')));assert.ok(skill);
if(!evidence.job){const j=await request(customer,'/jobs','POST',{partner_id:partner,skills:[{skill_id:skill.id,schema_version:skill.schema_version,answers:{}}],service_mode:'at_customer',address:{text:'Địa chỉ mô phỏng kiểm luồng B00-14, Hà Nội',point:{latitude:21.0285,longitude:105.8542}},time_mode:'now',note:'B00-14 · công việc mô phỏng đi qua API thật trên dvqb_local; không thực hiện dịch vụ hoặc thu tiền thật.'},'create',201);evidence.job=j.id;await save();}
let job=await request(owner,'/jobs/'+evidence.job);
await request(other,'/jobs/'+job.id,'GET',undefined,'forbidden',404);
if(job.state==='requested')job=await request(owner,'/jobs/'+job.id+'/accept','POST',{expected_version:job.version,eta:new Date(Date.now()+30*60000).toISOString()},'accept',200);
let invoice;
if(!evidence.invoice){invoice=await request(owner,'/jobs/'+job.id+'/invoice-draft','PUT',{expected_version:1,labor:'200000',materials:'50000',note:'Hóa đơn mô phỏng kiểm luồng API thật',result_asset_ids:[id('asset:result:0')]},'draft');evidence.invoice=invoice.id;await save();}else invoice=await request(owner,'/jobs/'+job.id+'/invoice');
const change=(actor,action,extra={})=>request(actor,'/invoices/'+invoice.id+'/'+action,'POST',{expected_version:invoice.version,...(action==='send'?{draft_version_id:invoice.version_id}:{version_id:invoice.version_id}),...extra},action,201);
if(invoice.state==='draft'){await request(customer,'/jobs/'+job.id+'/invoice','GET',undefined,'draft-private',404);invoice=await change(owner,'send');}
if(invoice.state==='sent'){invoice=await change(customer,'confirm',{points_used:'10000'});assert.equal(invoice.cash_due,'240000');}
if(!invoice.customer_payment_reported_at)invoice=await change(customer,'payment-reported',{confirmed:true});
if(invoice.state==='locked'){const result=await change(owner,'settle',{received_in_full:true});invoice=result.invoice;assert.equal(invoice.review_eligible,true);}
job=await request(customer,'/jobs/'+job.id);assert.equal(job.state,'completed');assert.equal(invoice.state,'settled');
evidence.status='PASS';evidence.finishedAt=new Date().toISOString();evidence.result={jobState:job.state,invoiceState:invoice.state,cashDue:invoice.cash_due,reviewEligible:invoice.review_eligible};await save();console.log(JSON.stringify({status:evidence.status,steps:evidence.steps.length,job:evidence.job}));
