// Explicit rescue for disposable DEMO fixtures only. Never opens a normal app database.
import {Pool} from 'pg';
import {pathToFileURL} from 'node:url';
import {localTestDatabase} from './local-safety.mjs';
export function rescueTarget(url,schema,id){
 localTestDatabase(url);
 if(!/^(test_[a-f0-9]{32}|drill_[a-f0-9]{32}_(source|restored))$/.test(schema)||!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id))throw Error('Rescue requires a disposable DEMO schema and UUID');
 return {url,schema,id};
}
export async function rescueDemoMfa(url,schema,id){
 rescueTarget(url,schema,id);const pool=new Pool({connectionString:url,options:`-c search_path=${schema},public`,connectionTimeoutMillis:3000}),db=await pool.connect();
 try{await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(2110202602)');await db.query('SELECT id FROM users WHERE id=$1 FOR NO KEY UPDATE',[id]);
  const users=(await db.query("SELECT DISTINCT u.id FROM users u JOIN admin_grants g ON g.user_id=u.id WHERE u.status='active' AND g.revoked_at IS NULL")).rows;
  if(users.length!==1||users[0].id!==id)throw Error('Only the last active DEMO admin can use rescue');
  const demo=(await db.query(`SELECT 1 FROM users u WHERE u.id=$1 AND u.display_name LIKE 'DEMO %'
   AND EXISTS(SELECT 1 FROM identities i WHERE i.user_id=u.id AND i.provider='email' AND i.subject LIKE '%@example.test')
   AND EXISTS(SELECT 1 FROM audit_events e WHERE e.resource_id=u.id AND e.action='admin.demo.bootstrap')`,[id])).rowCount;
  if(!demo)throw Error('Missing audited DEMO bootstrap identity');
  await db.query('DELETE FROM admin_backup_codes WHERE user_id=$1',[id]);await db.query('DELETE FROM admin_factors WHERE user_id=$1',[id]);
  await db.query('UPDATE admin_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE user_id=$1',[id]);
  await db.query('UPDATE users SET version=version+1 WHERE id=$1',[id]);
  await db.query("INSERT INTO audit_events(actor_id,action,resource_id,reason,details) VALUES($1,'admin.mfa.demo_rescue',$1,'Explicit local disposable DEMO rescue',jsonb_build_object('actor_kind','local_operator'))",[id]);
  await db.query('COMMIT');return {state:'mfa_reset',scope:'disposable DEMO only'};
 }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();await pool.end();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [schema,id]=process.argv.slice(2),url=process.env.TEST_DATABASE_URL??'postgresql://dvqb_test:test-only-password@127.0.0.1:55433/dvqb_test';
 console.log(JSON.stringify(await rescueDemoMfa(url,schema,id)));
}
