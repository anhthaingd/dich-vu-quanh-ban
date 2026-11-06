// Run as a short-lived ECS ops task. Never inject owner credentials into the API.
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { GetSecretValueCommand, PutSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

// Preserve the encryption/HMAC key for the whole lab lifetime. Never rotate on retry.
export function withLabFinanceSecret(runtime, enabled) {
  if (!enabled) return runtime;
  if (runtime.FINANCE_TEST_SECRET !== undefined) {
    if (typeof runtime.FINANCE_TEST_SECRET !== 'string' || runtime.FINANCE_TEST_SECRET.length < 32 || ['AUTH_SECRET','CURSOR_SECRET','MESSAGE_SECRET','ADMIN_SECRET'].some(k=>runtime[k]===runtime.FINANCE_TEST_SECRET)) throw Error('Invalid lab finance secret; restore the existing key, do not rotate it.');
    return runtime;
  }
  return {...runtime, FINANCE_TEST_SECRET:randomBytes(48).toString('base64url')};
}
export function bootstrapPermissions(labFinance = false) {
  return ['support.read','support.manage','moderation.manage','audit.read','accounts.manage','catalog.manage','reports.read','grant.manage',...(labFinance?['finance.read','finance.review']:[])];
}

export function runtimeSecrets(host, password = randomBytes(36).toString('base64url')) {
  if (!/^[a-zA-Z0-9.-]+$/.test(host) || !/^[\w-]{32,}$/.test(password)) throw Error('Invalid database identity');
  const url = new URL(`postgresql://dvqb_app@${host}:5432/dvqb`);
  url.password = password;
  return { DATABASE_URL: url.toString(), ...Object.fromEntries(['AUTH_SECRET','CURSOR_SECRET','MESSAGE_SECRET','ADMIN_SECRET'].map(k => [k,randomBytes(48).toString('base64url')])), GEOAPIFY_API_KEY: '' };
}
export function validateRuntime(value, host) {
  const url = new URL(value.DATABASE_URL);
  if(url.hostname!==host || url.username!=='dvqb_app' || url.pathname!=='/dvqb' || !/^[\w-]{32,}$/.test(url.password)) throw Error('Runtime secret targets a different database');
  if(['AUTH_SECRET','CURSOR_SECRET','MESSAGE_SECRET','ADMIN_SECRET'].some(k=>typeof value[k]!=='string'||value[k].length<32))throw Error('Invalid runtime secret');
  return url.password;
}

export async function grantRuntime(pool,password,setPassword) {
  if(!/^[\w-]{32,}$/.test(password))throw Error('Invalid runtime password');
      const db=await pool.connect();
      try {
        await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(2810202602)');
        if(!(await db.query("SELECT 1 FROM pg_roles WHERE rolname='dvqb_app'")).rowCount)await db.query('CREATE ROLE dvqb_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION');
        // password validated as base64url above, never shell- or SQL-interpolated user input.
        if(setPassword)await db.query(`ALTER ROLE dvqb_app PASSWORD '${password}'`);
        await db.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
        await db.query('GRANT CONNECT ON DATABASE dvqb TO dvqb_app');
        await db.query('GRANT USAGE ON SCHEMA public TO dvqb_app');
        const tables=await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tableowner=current_user AND tablename NOT IN ('schema_migrations','spatial_ref_sys')");
        for(const {tablename} of tables.rows)await db.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."${tablename.replaceAll('"','""')}" TO dvqb_app`);
        await db.query('GRANT SELECT ON public.spatial_ref_sys TO dvqb_app');
        await db.query('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO dvqb_app');
        await db.query('COMMIT');
      }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
}

async function main() {
  const action=process.argv[2];
  if(!['bootstrap','migrate','bootstrap-admin'].includes(action)||process.env.NODE_ENV!=='production')throw Error('Explicit production ops command required');
  for(const k of ['DB_HOST','DB_NAME','DB_OWNER','DB_PASSWORD','DATABASE_CA_FILE','RUNTIME_SECRET_ARN'])if(!process.env[k])throw Error('Missing ops configuration');
  const { connectionOptions }=await import('../../services/api/dist/src/database/connection.js');
  const { migrate }=await import('../../services/api/dist/src/database/migrate.js');
  const { seed }=await import('../../services/api/dist/src/database/seed.js');
  const url=new URL(`postgresql://${process.env.DB_HOST}:5432/${process.env.DB_NAME}`);
  url.username=process.env.DB_OWNER;url.password=process.env.DB_PASSWORD;
  const pool=new Pool({...connectionOptions(url.toString(),process.env.DATABASE_CA_FILE),max:1,connectionTimeoutMillis:10000});
  try {
    // max=1 keeps this session lock on the single connection, including migrations.
    await pool.query('SELECT pg_advisory_lock(2810202603)');
    if(action==='bootstrap-admin'){
      const email=process.argv[3];
      if(!email||!email.includes('@'))throw Error('Provide the already verified owner email');
      const db=await pool.connect();
      try{
        await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(2810202601)');
        if((await db.query('SELECT 1 FROM admin_grants LIMIT 1')).rowCount)throw Error('Bootstrap admin already exists; use MFA-protected grant management');
        const user=(await db.query("SELECT u.id FROM users u JOIN identities i ON i.user_id=u.id WHERE i.provider='email' AND i.subject=$1 AND i.verified_at IS NOT NULL AND u.status='active' FOR UPDATE OF u",[email.toLowerCase()])).rows[0];
        if(!user)throw Error('Register and verify the owner account first');
        for(const permission of bootstrapPermissions(process.env.LAB_FINANCE_TEST==='1'))await db.query('INSERT INTO admin_grants(user_id,permission) VALUES($1,$2)',[user.id,permission]);
        await db.query("INSERT INTO audit_events(actor_id,action,resource_id,reason,details) VALUES($1,'admin.cloud.bootstrap',$1,'Initial owner through restricted ECS ops task','{}')",[user.id]);
        await db.query('COMMIT');
      }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
    }else{
      const secrets=new SecretsManagerClient({maxAttempts:3});
      let runtime;
      try{runtime=JSON.parse((await secrets.send(new GetSecretValueCommand({SecretId:process.env.RUNTIME_SECRET_ARN}))).SecretString);}
      catch(e){if(action!=='bootstrap'||e.name!=='ResourceNotFoundException')throw e;}
      if(!runtime){runtime=runtimeSecrets(process.env.DB_HOST);await secrets.send(new PutSecretValueCommand({SecretId:process.env.RUNTIME_SECRET_ARN,SecretString:JSON.stringify(runtime)}));}
      const updated=withLabFinanceSecret(runtime,process.env.LAB_FINANCE_TEST==='1');
      if(updated!==runtime){runtime=updated;await secrets.send(new PutSecretValueCommand({SecretId:process.env.RUNTIME_SECRET_ARN,SecretString:JSON.stringify(runtime)}));}
      const password=validateRuntime(runtime,process.env.DB_HOST);
      await migrate(pool);
      if(action==='bootstrap')await seed(pool); // Curated catalog only: never demo users/jobs/balances.
      await grantRuntime(pool,password,action==='bootstrap');
    }
    console.log(`Cloud database ${action} completed; no credentials printed.`);
  }finally{try{await pool.query('SELECT pg_advisory_unlock(2810202603)');}finally{await pool.end();}}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  main().catch(()=>{console.error('Cloud database operation failed. Check configuration, permissions and DB logs; secret/error payload suppressed.');process.exitCode=1;});
}
