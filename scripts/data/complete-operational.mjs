// Review-driven corrections to this seed batch only; never touches pre-existing data.
import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {Pool} from 'pg';
import {MessageSecrets} from '../../services/api/src/integrations/local-messages.ts';
import {batch,id,partnerKind,person,requireOperationalTarget} from './operational-model.mjs';
const env=parseEnv(await readFile('services/api/.env','utf8'));requireOperationalTarget(env);
const path='.local/seed-operational/manifest.json',manifest=JSON.parse(await readFile(path,'utf8')),pool=new Pool({connectionString:env.DATABASE_URL});const db=await pool.connect();
try{await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[batch]);const old=(await db.query('SELECT 1 FROM audit_events WHERE id=$1',[id('seed-completion')])).rowCount;if(!old){
 const actions=[];const cipher=new MessageSecrets(env.FINANCE_LOCAL_SECRET);
 for(let p=0;p<72;p++){await db.query('UPDATE bank_change_requests SET account_cipher=$2 WHERE id=$1',[id('bank-request:'+p),cipher.encrypt('000000'+String(p).padStart(10,'0'))]);await db.query('UPDATE verified_bank_accounts SET account_cipher=$2 WHERE id=$1',[id('bank:'+p),cipher.encrypt('000000'+String(p).padStart(10,'0'))]);}
 for(let j=0;j<1008;j++){
  const c=manifest.cases[j];if(!['completed','admin_completed'].includes(c.scenario))continue;
  if(c.scenario==='admin_completed'){
   if(j%2){actions.push({job:c.job,reason:'No reviews before both payment marks'});await db.query('DELETE FROM reviews WHERE id=ANY($1::uuid[]) AND job_id=$2',[['customer_to_partner','partner_to_customer'].map(d=>id('review:'+j+':'+d)),c.job]);continue;}
   await db.query('UPDATE invoices i SET customer_payment_reported_at=j.completed_at,worker_receipt_confirmed_at=j.completed_at,worker_receipt_by=m.user_id,version=i.version+1 FROM jobs j,assignments a,memberships m WHERE i.id=$1 AND j.id=i.job_id AND a.job_id=j.id AND a.ended_at IS NULL AND m.id=a.membership_id',[c.invoice]);
  }
  const p=j%60;await db.query('UPDATE reviews SET author_id=$2,version=version+1 WHERE id=$1',[id('review:'+j+':partner_to_customer'),id('user:'+p)]);
  const r=(await db.query('SELECT r.*,a.object_key,a.bytes,a.checksum FROM reviews r JOIN assets a ON a.id=r.asset_id WHERE r.id=$1',[id('review:'+j+':customer_to_partner')])).rows[0];if(r){const aid=id('asset:review-job:'+j),key=id('object:review-job:'+j),bytes=await readFile(resolve(manifest.assetDirectory,r.object_key+'.png'));await writeFile(resolve(manifest.assetDirectory,key+'.png'),bytes,{mode:0o600});await db.query("INSERT INTO assets(id,uploader_id,object_key,purpose,mime,bytes,status,checksum,uploaded_checksum,created_at) VALUES($1,$2,$3,'review','image/png',$4,'ready',$5,$5,$6) ON CONFLICT(id) DO NOTHING",[aid,r.author_id,key,bytes.length,r.checksum,r.created_at]);await db.query('UPDATE reviews SET asset_id=$2,version=version+1 WHERE id=$1',[r.id,aid]);manifest.assets.push({id:aid,key,private:false,sha256:createHash('sha256').update(bytes).digest('hex')});}
 }
 await db.query("INSERT INTO audit_events(id,actor_id,action,resource_id,reason,details) VALUES($1,$2,'local.operational.review',$3,$4,$5)",[id('seed-completion'),id('user:240'),id(batch),'Đối chiếu điều kiện đánh giá, chủ sở hữu ảnh và định dạng ngân hàng của bộ seed',JSON.stringify({actions,scope:'Only operational-20261030-v1 synthetic rows'})]);
 manifest.completedAt=new Date().toISOString();await writeFile(path,JSON.stringify(manifest)+'\n',{mode:0o600});await db.query('COMMIT');console.log('Seed review corrections committed.');
}else{await db.query('COMMIT');console.log('Seed review corrections already applied.');}
await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[batch]);const geometry=await db.query('UPDATE service_areas SET center=ST_PointOnSurface(boundary::geometry)::geography WHERE id=ANY($1::uuid[]) AND boundary IS NOT NULL AND center IS NULL',[Array.from({length:72},(_,i)=>id('area:'+i))]);await db.query('COMMIT');console.log(JSON.stringify({seedPolygonRepresentatives:geometry.rowCount}));
await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[batch]);
for(let p=0;p<72;p++){const kind=partnerKind(p);if(kind==='solo'){
 const members=[id('employee:'+p),id('invited-member:'+p)];
 await db.query('DELETE FROM membership_grants WHERE membership_id=ANY($1::uuid[])',[members]);
 await db.query('DELETE FROM memberships WHERE id=ANY($1::uuid[]) AND NOT is_owner',[members]);
 await db.query('DELETE FROM local_deliveries WHERE invitation_id=$1',[id('invite:'+p)]);
 await db.query('DELETE FROM member_invitations WHERE id=$1',[id('invite:'+p)]);
}else if(['solo','shop','company'][Math.floor(p/3)%3]==='solo'){
 const name='Dịch vụ '+person(p)+(p<9?' · '+['Hà Nội','TP Hồ Chí Minh','Đà Nẵng'][p%3]:'');
 await db.query('UPDATE partners SET kind=$2,name=$3 WHERE id=$1',[id('partner:'+p),kind,name]);
 const cipher=new MessageSecrets(env.ADMIN_LOCAL_SECRET),r=(await db.query('SELECT private_cipher FROM verification_requests WHERE id=$1',[id('verification:'+p)])).rows[0];if(r){const details=JSON.parse(cipher.decrypt(r.private_cipher));details.kind='business';await db.query('UPDATE verification_requests SET kind=$2,private_cipher=$3 WHERE id=$1',[id('verification:'+p),'business',cipher.encrypt(JSON.stringify(details))]);}
}}
await db.query("UPDATE jobs j SET time_mode='scheduled',scheduled_at=h.new_at,eta=h.new_at FROM schedule_history h WHERE j.id=ANY($1::uuid[]) AND h.job_id=j.id AND h.version=j.schedule_version AND (j.time_mode<>'scheduled' OR j.scheduled_at IS DISTINCT FROM h.new_at)",[manifest.cases.filter(c=>c.scenario==='rescheduled').map(c=>c.job)]);
await db.query("UPDATE reviews SET removed_at=created_at+interval '2 hours',version=version+1 WHERE id=ANY($1::uuid[]) AND removed_at IS NULL",[manifest.cases.flatMap((c,j)=>(j%19===0&&['completed','admin_completed'].includes(c.scenario))?[id('review:'+j+':customer_to_partner')]:[])]);
await db.query('COMMIT');console.log('Synthetic individual providers now have owner-only memberships.');
}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();await pool.end();}
