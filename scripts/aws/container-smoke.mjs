// Reproducible local test of the release image; no AWS account/provider calls.
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const image=process.argv[2]??'dvqb-api:infra-test';
const suffix=randomBytes(4).toString('hex'),network=`dvqb-smoke-${suffix}`,db=`dvqb-db-${suffix}`,api=`dvqb-api-${suffix}`;
const directory=mkdtempSync(join(tmpdir(),'dvqb-cloud-'));
const run=(cmd,args)=>execFileSync(cmd,args,{encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:120000});
const docker=args=>run('docker',args);
const secret=randomBytes(36).toString('base64url'),owner=randomBytes(36).toString('base64url');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
try{
 run('openssl',['req','-x509','-nodes','-newkey','rsa:2048','-keyout',join(directory,'server.key'),'-out',join(directory,'server.crt'),'-days','2','-subj',`/CN=${db}`,'-addext',`subjectAltName=DNS:${db}`]);
 docker(['network','create',network]);
 docker(['run','-d','--name',db,'--network',network,'-e','POSTGRES_USER=dvqb_owner','-e',`POSTGRES_PASSWORD=${owner}`,'-e','POSTGRES_DB=dvqb','-v',`${directory}:/tls:ro`,'postgis/postgis:17-3.5@sha256:01a6a70e41e6c4467c8f55f6063555ed72db2d6662cd0d571040d42eadaeb6f6','/bin/bash','-c','cp /tls/server.* /tmp/; chown postgres:postgres /tmp/server.*; chmod 600 /tmp/server.key; exec docker-entrypoint.sh postgres -c ssl=on -c ssl_cert_file=/tmp/server.crt -c ssl_key_file=/tmp/server.key']);
 for(let i=0;;i++){try{docker(['exec',db,'pg_isready','-h','127.0.0.1','-U','dvqb_owner','-d','dvqb']);break;}catch{if(i>=60)throw Error('Isolated DB did not start');await wait(500);}}
 // These variables are random, disposable test values only, never account credentials.
 const sqlTest=`import {Pool} from 'pg';import {connectionOptions} from './services/api/dist/src/database/connection.js';import {migrate} from './services/api/dist/src/database/migrate.js';import {seed} from './services/api/dist/src/database/seed.js';import {grantRuntime} from './scripts/aws/database.mjs';
 const p=new Pool({...connectionOptions(process.env.TEST_OWNER_URL,'/app/test-ca.pem'),max:1});await migrate(p);await seed(p);await grantRuntime(p,process.env.TEST_APP_PASSWORD,true);await grantRuntime(p,process.env.TEST_APP_PASSWORD,false);
 const ssl=(await p.query('SELECT ssl,version FROM pg_stat_ssl WHERE pid=pg_backend_pid()')).rows[0];if(!ssl.ssl)throw Error('TLS missing');console.log('TLS '+ssl.version+'; migrations, catalog, runtime grants passed');await p.end();
 const app=new Pool({...connectionOptions(process.env.TEST_APP_URL,'/app/test-ca.pem'),max:1});await app.query('SELECT id FROM categories LIMIT 1');for(const sql of ['CREATE TABLE public.forbidden(id int)','SELECT * FROM schema_migrations']){let denied=false;try{await app.query(sql);}catch(e){denied=e.code==='42501';}if(!denied)throw Error('Runtime privilege escalation');}await app.end();
 const bad=new Pool({...connectionOptions(process.env.TEST_APP_URL,'/app/rds-ca.pem'),max:1,connectionTimeoutMillis:3000});let rejected=false;try{await bad.query('SELECT 1');}catch{rejected=true;}await bad.end();if(!rejected)throw Error('Wrong CA accepted');console.log('Runtime DDL/migration reads denied; wrong CA rejected');`;
 console.log(docker(['run','--rm','--platform','linux/amd64','--network',network,'--read-only','--cap-drop','ALL','-v',`${directory}/server.crt:/app/test-ca.pem:ro`,'-e',`TEST_OWNER_URL=postgresql://dvqb_owner:${owner}@${db}/dvqb`,'-e',`TEST_APP_URL=postgresql://dvqb_app:${secret}@${db}/dvqb`,'-e',`TEST_APP_PASSWORD=${secret}`,image,'node','--input-type=module','-e',sqlTest]).trim());
 const env={NODE_ENV:'production',CLOUD_PILOT:'1',HOST:'0.0.0.0',DATABASE_URL:`postgresql://dvqb_app:${secret}@${db}/dvqb`,DATABASE_CA_FILE:'/app/test-ca.pem',AUTH_SECRET:randomBytes(48).toString('hex'),CURSOR_SECRET:randomBytes(48).toString('hex'),ADMIN_SECRET:randomBytes(48).toString('hex'),MESSAGE_SECRET:randomBytes(48).toString('hex'),PUBLIC_API_ORIGIN:'https://api.example.test',CORS_ORIGIN:'https://app.example.test',PILOT_EMAILS:'owner@example.test',ASSET_BUCKET:'unused-private-test',SES_FROM:'noreply@example.test',AWS_REGION:'ap-southeast-1'};
 const envPath=join(directory,'api.env');writeFileSync(envPath,Object.entries(env).map(([k,v])=>`${k}=${v}`).join('\n'),{mode:0o600});
 docker(['run','-d','--name',api,'--platform','linux/amd64','--network',network,'--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','-p','127.0.0.1::3100','-v',`${directory}/server.crt:/app/test-ca.pem:ro`,'--env-file',envPath,image]);
 const port=docker(['port',api,'3100/tcp']).trim().split(':').pop(),base=`http://127.0.0.1:${port}/v1`;
 for(let i=0;;i++){try{const r=await fetch(base+'/ready');if(!r.ok)throw Error('not ready');break;}catch{if(i>=60)throw Error('API did not become ready');await wait(500);}}
 for(const route of ['/health','/ready','/categories'])assert.equal((await fetch(base+route)).status,200);
 const register=email=>fetch(base+'/auth/register',{method:'POST',headers:{'content-type':'application/json',origin:'https://app.example.test'},body:JSON.stringify({email,display_name:'Cloud Test',password:'Isolated container test password 2026'})});
 assert.equal((await register('outside@example.test')).status,400);
 const registered=await register('owner@example.test');assert.equal(registered.status,201);assert.equal(registered.headers.get('access-control-allow-origin'),'https://app.example.test');const session=await registered.json();
 assert.equal((await fetch(base+'/me',{headers:{authorization:'Bearer '+session.access_token}})).status,200);
 assert.equal((await fetch(base+'/health',{headers:{origin:'https://evil.example.test'}})).headers.get('access-control-allow-origin'),null);
 assert.equal(docker(['exec',api,'id','-u']).trim(),'1000');
 const readonly=docker(['exec',api,'node','-e',"try{require('fs').writeFileSync('/app/no-write','x');process.exit(1)}catch(e){if(e.code!=='EROFS')process.exit(2)}"]);assert.equal(readonly,'');
 docker(['stop','-t','10',api]);assert.equal(docker(['inspect','-f','{{.State.ExitCode}}',api]).trim(),'0');
 console.log('PASS: release image boots, health/ready/catalog, invite gate, auth, CORS, non-root/read-only, graceful shutdown. No AWS calls.');
}catch(error){console.error('Container smoke failed:',String(error.stderr||error.message||error).replaceAll(owner,'[test-secret]').replaceAll(secret,'[test-secret]').slice(0,2500));process.exitCode=1;}
finally{for(const name of [api,db])try{docker(['rm','-f',name]);}catch{/* only this test's random names */}try{docker(['network','rm',network]);}catch{/* cleanup after startup failure */}rmSync(directory,{recursive:true,force:true});}
