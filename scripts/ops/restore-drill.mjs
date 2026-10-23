import sharp from 'sharp';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {MessageSecrets} from '../../services/api/dist/src/integrations/local-messages.js';
import {fileManifest,restoreFiles} from './backup-files.mjs';
// Local-only exercise. Every row is DEMO; neither source nor destination is a user's schema.
import 'reflect-metadata';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile,mkdtemp,rm} from 'node:fs/promises';
import {Pool} from 'pg';
import {migrate} from '../../services/api/dist/src/database/migrate.js';
import {seed} from '../../services/api/dist/src/database/seed.js';
import {localTestDatabase,drillSchema,remapDump} from './local-safety.mjs';
const connectionString=process.env.TEST_DATABASE_URL??'postgresql://dvqb_test:test-only-password@127.0.0.1:55433/dvqb_test';
localTestDatabase(connectionString);
const suffix=randomUUID().replaceAll('-',''),source=drillSchema(`drill_${suffix}_source`),target=drillSchema(`drill_${suffix}_restored`);
const container=execFileSync('docker',['compose','-f','infra/compose.yaml','ps','-q','db-test'],{encoding:'utf8'}).trim();
if(!/^[a-f0-9]{12,64}$/.test(container))throw new Error('Start compose db-test before drill');
const admin=new Pool({connectionString}),pool=new Pool({connectionString,options:`-c search_path=${source},public`});let restored;
const started=Date.now(),filesRoot=await mkdtemp(join(tmpdir(),'dvqb-full-restore-')),filesSource=join(filesRoot,'source'),filesTarget=join(filesRoot,'restored');
const demoKey=randomBytes(32).toString('hex'),secrets=new MessageSecrets(demoKey),privateImage=await sharp({create:{width:16,height:16,channels:3,background:'#2457D6'}}).png().toBuffer();
const objectKey=randomUUID(),factorSecret='DEMO restore factor '+randomUUID();
async function snapshot(db,schema){
 const tables=(await db.query("SELECT tablename FROM pg_tables WHERE schemaname=$1 ORDER BY tablename",[schema])).rows.map(x=>x.tablename),counts={},hash=createHash('sha256');
 for(const table of tables){const rows=(await db.query(`SELECT row_to_json(t)::text AS row FROM "${schema}"."${table}" t ORDER BY row_to_json(t)::text`)).rows;counts[table]=rows.length;hash.update(table);for(const r of rows)hash.update(r.row);}
 const invariants=(await db.query(`SELECT (SELECT count(*) FROM pg_constraint WHERE connamespace=$1::text::regnamespace)::int AS constraints,(SELECT count(*) FROM pg_indexes WHERE schemaname=$1::text)::int AS indexes,(SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relnamespace=$1::text::regnamespace AND NOT t.tgisinternal)::int AS triggers`,[schema])).rows[0];
 assert.equal((await db.query('SELECT transaction_id,unit FROM ledger_entries GROUP BY transaction_id,unit HAVING sum(delta)<>0')).rowCount,0);
 assert.equal((await db.query('SELECT a.id FROM ledger_accounts a LEFT JOIN ledger_entries e ON e.account_id=a.id GROUP BY a.id HAVING a.balance<>COALESCE(sum(e.delta),0)')).rowCount,0);
 return {counts,digest:hash.digest('hex'),invariants};
}
try{
 await mkdir(filesSource,{mode:0o700});for(const group of ['assets','keys'])await mkdir(join(filesSource,group),{mode:0o700});
 await writeFile(join(filesSource,'keys/admin.key'),demoKey,{mode:0o600});
 for(const ext of ['raw','png'])await writeFile(join(filesSource,'assets',objectKey+'.'+ext),secrets.encrypt(privateImage.toString('base64')),{mode:0o600});
 await admin.query(`CREATE SCHEMA ${source}`);await migrate(pool);await seed(pool);
 const db=await pool.connect();try{await db.query('BEGIN');const user=(await db.query("INSERT INTO users(display_name) VALUES('DEMO restore drill') RETURNING id")).rows[0].id;
 await db.query("INSERT INTO assets(uploader_id,object_key,purpose,mime,bytes,status,checksum,uploaded_checksum) VALUES($1,$2,'verification','image/png',$3,'ready',$4,$4)",[user,objectKey,privateImage.length,createHash('sha256').update(privateImage).digest('hex')]);
 await db.query("INSERT INTO admin_factors(user_id,secret_cipher,enrollment_family,pending_until,enabled_at) VALUES($1,$2,$3,now(),now())",[user,secrets.encrypt(factorSecret),randomUUID()]);
 const accounts=(await db.query("INSERT INTO ledger_accounts(system_code,unit) VALUES('drill_cash','VND'),('drill_offset','VND') RETURNING id")).rows;
 const tx=(await db.query("INSERT INTO ledger_transactions(operation_key,kind,actor_id,correlation_id) VALUES('DEMO restore','drill',$1,$2) RETURNING id",[user,randomUUID()])).rows[0].id;
 await db.query("INSERT INTO ledger_entries(transaction_id,account_id,unit,delta,posting_code) VALUES($1,$2,'VND',100000,'demo'),($1,$3,'VND',-100000,'demo')",[tx,accounts[0].id,accounts[1].id]);
 await db.query("INSERT INTO holds(account_id,kind,reference_id,amount) VALUES($1,'payout',$2,50000)",[accounts[0].id,randomUUID()]);
 await db.query("INSERT INTO audit_events(actor_id,action,resource_id,reason,details) VALUES($1,'drill',$1,'DEMO','{}')",[user]);
 await db.query("INSERT INTO idempotency_keys(actor_id,operation,request_key,request_hash,state,response_snapshot) VALUES($1,'drill',$2,'DEMO','completed','{}')",[user,randomUUID()]);await db.query('COMMIT');}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 const before=await snapshot(pool,source),files=await fileManifest(filesSource);
 const dump=execFileSync('docker',['exec',container,'pg_dump','-U','dvqb_test','-d','dvqb_test','--schema='+source,'--no-owner','--no-privileges'],{encoding:'utf8',maxBuffer:32*1024*1024});
 const backupMs=Date.now()-started,restoreStart=Date.now();
 execFileSync('docker',['exec','-i',container,'psql','-U','dvqb_test','-d','dvqb_test','-v','ON_ERROR_STOP=1'],{input:remapDump(dump,source,target),encoding:'utf8',maxBuffer:8*1024*1024,stdio:['pipe','pipe','pipe']});
 await restoreFiles(filesSource,filesTarget,files);
 restored=new Pool({connectionString,options:`-c search_path=${target},public`});const after=await snapshot(restored,target);assert.deepEqual(after,before);
 const restoredSecrets=new MessageSecrets(await readFile(join(filesTarget,'keys/admin.key'),'utf8'));
 const asset=(await restored.query("SELECT object_key,uploaded_checksum FROM assets WHERE purpose='verification'")).rows[0];
 const restoredImage=Buffer.from(restoredSecrets.decrypt(await readFile(join(filesTarget,'assets',asset.object_key+'.png'),'utf8')),'base64');
 assert.equal(createHash('sha256').update(restoredImage).digest('hex'),asset.uploaded_checksum);assert.equal((await sharp(restoredImage).metadata()).width,16);
 const factor=(await restored.query('SELECT secret_cipher FROM admin_factors')).rows[0];assert.equal(restoredSecrets.decrypt(factor.secret_cipher),factorSecret);
 assert.throws(()=>new MessageSecrets(randomBytes(32).toString('hex')).decrypt(factor.secret_cipher));
 const missingKey=join(filesTarget,'keys/admin.key');await rm(missingKey);await assert.rejects(readFile(missingKey),{code:'ENOENT'});await writeFile(missingKey,demoKey,{mode:0o600});
 assert.deepEqual(await fileManifest(filesTarget),files);
 // Restart compatibility: repeated current migrations keep every restored row unchanged.
 await migrate(restored);assert.deepEqual(await snapshot(restored,target),before);
 await assert.rejects(restored.query('DELETE FROM ledger_entries'));await assert.rejects(restored.query('DELETE FROM audit_events'));
 await assert.rejects(restored.query("INSERT INTO identities(user_id,provider,subject) VALUES($1,'email','invalid@example.test')",[randomUUID()]));
 const report={result:'passed',scope:'disposable local DEMO schemas only',checked_at:new Date().toISOString(),backup_ms:backupMs,restore_verify_ms:Date.now()-restoreStart,...before,private_files:files.length,checks:['private assets and DEMO key hashes/modes preserved','restored key decrypts database factor and private PNG','wrong key and missing key fail','all table rows preserved','FK/index/trigger counts match','balanced ledger and balance projection','active hold and idempotency preserved','immutable ledger and audit enforced after restore','migration restart is idempotent'],limits:['No production backup','No approved production RPO/RTO']};
 await mkdir('test-results/ops',{recursive:true});await writeFile('test-results/ops/restore-drill.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({result:report.result,tables:Object.keys(before.counts).length,invariants:before.invariants,backup_ms:backupMs,restore_verify_ms:report.restore_verify_ms}));
}finally{await rm(filesRoot,{recursive:true,force:true});await pool.end();await restored?.end();try{await admin.query(`DROP SCHEMA IF EXISTS ${target} CASCADE`);await admin.query(`DROP SCHEMA IF EXISTS ${source} CASCADE`);}finally{await admin.end();}}
