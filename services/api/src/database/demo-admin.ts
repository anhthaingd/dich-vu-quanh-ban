// Explicit local fixture command. Never called by startup, seed or migrations.
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir,open} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Pool} from 'pg';
import {config} from '../config/environment.js';
import {hashPassword} from '../modules/auth/password.js';
const settings=config();
if(!settings.admin||new URL(settings.databaseUrl).pathname!=='/dvqb_p1_demo')throw Error('Admin fixture requires isolated loopback dvqb_p1_demo and ADMIN_LOCAL_SECRET');
const file=resolve('../../.local/demo-admin.json');
await mkdir(resolve('../../.local'),{recursive:true});
// Exclusive creation prevents accidentally replacing credentials or granting an existing user.
const output=await open(file,'wx',0o600),email=`demo-admin-${randomUUID()}@example.test`,password=randomBytes(24).toString('base64url');
await output.writeFile(JSON.stringify({purpose:'DEMO LOCAL ONLY',email,password},null,2)+'\n');await output.close();
const pool=new Pool({connectionString:settings.databaseUrl,connectionTimeoutMillis:3000}),db=await pool.connect();
try{
 await db.query('BEGIN');const user=(await db.query("INSERT INTO users(display_name) VALUES('DEMO Admin') RETURNING id")).rows[0];
 await db.query("INSERT INTO identities(user_id,provider,subject,password_hash) VALUES($1,'email',$2,$3)",[user.id,email,await hashPassword(password)]);
 for(const permission of ['support.read','support.manage','moderation.manage','audit.read'])await db.query('INSERT INTO admin_grants(user_id,permission) VALUES($1,$2)',[user.id,permission]);
 await db.query("INSERT INTO audit_events(actor_id,action,resource_id,reason,details) VALUES($1,'admin.demo.bootstrap',$1,'Local DEMO fixture','{}')",[user.id]);
 await db.query('COMMIT');process.stdout.write('Created separate DEMO admin. Credentials: .local/demo-admin.json (0600). Complete TOTP setup in the admin UI.\n');
}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();await pool.end();}
