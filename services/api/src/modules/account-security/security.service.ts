import {BadRequestException,ConflictException,ForbiddenException,HttpException,NotFoundException} from '@nestjs/common';
import {randomBytes,randomInt} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {Cursor} from '../../common/http/cursor.js';
import {AuthService} from '../auth/auth.service.js';
import {AdminAuthService} from '../admin-auth/admin-auth.service.js';
import {LocalMessages} from '../../integrations/local-messages.js';
import {hashPassword,verifyPassword} from '../auth/password.js';
import type * as Input from './security.input.js';
type Actor=Awaited<ReturnType<AuthService['authenticate']>>;
type Challenge=ReturnType<typeof Input.challenge>&{expected_version?:number};type Confirm=ReturnType<typeof Input.confirm>;
export class SecurityService {
 constructor(private readonly pool:Pool,private readonly auth:AuthService,private readonly messages:LocalMessages,private readonly admin:AdminAuthService,private readonly cursor:Cursor){}
 private async tx<T>(work:(db:PoolClient)=>Promise<T>){const db=await this.pool.connect();try{await db.query('BEGIN');const r=await work(db);await db.query('COMMIT');return r;}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}}
 private async actor(db:PoolClient,header:string|undefined){const a=await this.auth.authenticate(header);await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[a.user.id]);return this.auth.authenticate(header,db);}
 private async rate(db:PoolClient,contact:string,ip:string,purpose:string,actor:string|null=null){
  const c=this.messages.secrets.hash(contact),i=this.messages.secrets.hash(ip);
  for(const k of [c,i].sort())await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[k]);
  const r=(await db.query(`SELECT actor_id,contact_hash,ip_hash,created_at FROM auth_rate_events WHERE purpose=$1 AND created_at>clock_timestamp()-interval '1 hour' AND (contact_hash=$2 OR ip_hash=$3 OR actor_id=$4)`,[purpose,c,i,actor])).rows;
  if(actor&&r.filter(x=>x.actor_id===actor).length>=20||r.filter(x=>x.contact_hash===c).length>=5||r.filter(x=>x.ip_hash===i).length>=100||r.some(x=>x.contact_hash===c&&x.created_at>new Date(Date.now()-60000)))throw new HttpException({code:'RATE_LIMITED'},429);
  await db.query('INSERT INTO auth_rate_events(actor_id,contact_hash,ip_hash,purpose) VALUES($1,$2,$3,$4)',[actor,c,i,purpose]);
 }
 private async proof(db:PoolClient,a:Actor,password:string|undefined,ip:string){
  const n=(await db.query("SELECT count(*) FROM auth_rate_events WHERE actor_id=$1 AND purpose='account.password' AND created_at>clock_timestamp()-interval '15 minutes'",[a.user.id])).rows[0];
  if(Number(n.count)>=5)throw new HttpException({code:'RATE_LIMITED'},429);
  await db.query("INSERT INTO auth_rate_events(actor_id,contact_hash,ip_hash,purpose) VALUES($1,'password',$2,'account.password')",[a.user.id,this.messages.secrets.hash(ip)]);
  const i=(await db.query("SELECT password_hash FROM identities WHERE user_id=$1 AND provider='email'",[a.user.id])).rows[0];
  return verifyPassword(password??'',i?.password_hash??null);
 }
 private async issue(db:PoolClient,user:string|null,provider:string,contact:string,purpose:string,family:string|null=null,recovery:string|null=null,userVersion:number|null=null){
  const h=this.messages.secrets.hash(contact),code=String(randomInt(0,1000000)).padStart(6,'0');
  await db.query('UPDATE auth_challenges SET invalidated_at=clock_timestamp() WHERE purpose=$1 AND contact_hash=$2 AND user_id IS NOT DISTINCT FROM $3 AND consumed_at IS NULL',[purpose,h,user]);
  const c=(await db.query(`INSERT INTO auth_challenges(user_id,provider,contact_hash,contact_cipher,code_hash,purpose,family_id,recovery_id,user_version,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,clock_timestamp()+interval '5 minutes') RETURNING id,expires_at`,[user,provider,h,this.messages.secrets.encrypt(contact),this.messages.secrets.hash(code),purpose,family,recovery,userVersion])).rows[0];
  if(user)await this.messages.queue(db,'challenge',c.id,{contact,subject:'Bảo mật tài khoản — DEMO',text:`Mã ${purpose}: ${code}. Có hiệu lực 5 phút, dùng một lần. DEMO local/test.`},c.expires_at);
  return {id:c.id,expires_at:c.expires_at.toISOString(),resend_after_seconds:60};
 }
 async request(header:string|undefined,b:Challenge,ip:string,key?:string){
  this.messages.requireContact(b.contact);
  const result=await this.tx(async db=>{
   let user:string|null=null,family:string|null=null,userVersion:number|null=null;
   if(b.purpose==='identity'){
    const a=await this.actor(db,header);
    if(key){const old=(await db.query("SELECT request_hash,response_snapshot FROM idempotency_keys WHERE actor_id=$1 AND operation='changeIdentity' AND request_key=$2",[a.user.id,key])).rows[0];if(old){if(old.request_hash!==this.messages.secrets.hash(JSON.stringify(b)))throw new ConflictException({code:'IDEMPOTENCY_MISMATCH'});return old.response_snapshot;}}
    if(b.expected_version!==undefined&&a.user.version!==b.expected_version)throw new ConflictException({code:'VERSION_CONFLICT'});
    if(!await this.proof(db,a,b.password,ip))return null;
    user=a.user.id;userVersion=a.user.version;family=(await db.query('SELECT family_id FROM sessions WHERE id=$1',[a.sessionId])).rows[0].family_id;
   }else{user=(await db.query(`SELECT i.user_id FROM identities i JOIN users u ON u.id=i.user_id WHERE i.provider=$1 AND i.subject=$2 AND i.verified_at IS NOT NULL AND u.status IN ('active','suspended')`,[b.provider,b.contact])).rows[0]?.user_id??null;}
   await this.rate(db,b.contact,ip,b.purpose,user);
   const response=await this.issue(db,user,b.provider,b.contact,b.purpose,family,null,userVersion);
   if(key&&user)await db.query("INSERT INTO idempotency_keys(actor_id,operation,request_key,request_hash,state,response_snapshot) VALUES($1,'changeIdentity',$2,$3,'completed',$4)",[user,key,this.messages.secrets.hash(JSON.stringify(b)),JSON.stringify(response)]);
   return response;
  });if(!result)throw new ForbiddenException({code:'REAUTH_REQUIRED'});return result;
 }
 private async consume(db:PoolClient,b:Confirm,a?:Actor){
  const c=(await db.query('SELECT * FROM auth_challenges WHERE id=$1 FOR UPDATE',[b.challenge_id])).rows[0];
  if(!c||c.purpose!==b.purpose||!c.user_id||c.consumed_at||c.invalidated_at||c.attempts>=5||c.expires_at<=new Date())return null;
  if(a){const s=(await db.query('SELECT family_id FROM sessions WHERE id=$1',[a.sessionId])).rows[0];if(c.user_id!==a.user.id||c.family_id!==s?.family_id)return null;}
  if(c.code_hash!==this.messages.secrets.hash(b.code)){await db.query('UPDATE auth_challenges SET attempts=attempts+1 WHERE id=$1',[c.id]);return null;}
  return c;
 }
 async revoke(db:PoolClient,user:string){
  for(const table of ['sessions','admin_sessions','push_devices'])await db.query(`UPDATE ${table} SET revoked_at=COALESCE(revoked_at,clock_timestamp()) WHERE user_id=$1`,[user]);
  await db.query('UPDATE auth_challenges SET invalidated_at=clock_timestamp() WHERE user_id=$1 AND consumed_at IS NULL',[user]);
  await db.query('UPDATE reauth_grants SET consumed_at=COALESCE(consumed_at,clock_timestamp()) WHERE user_id=$1',[user]);
 }
 async confirm(header:string|undefined,b:Confirm,receipt?:string,key?:string){
  const result=await this.tx(async db=>{
   let a:Actor|undefined;
   if(b.purpose==='identity'){a=await this.actor(db,header);
    if(key){const old=(await db.query("SELECT request_hash,response_snapshot FROM idempotency_keys WHERE actor_id=$1 AND operation='confirmIdentityChange' AND request_key=$2",[a.user.id,key])).rows[0];if(old){if(old.request_hash!==this.messages.secrets.hash(JSON.stringify(b)))throw new ConflictException({code:'IDEMPOTENCY_MISMATCH'});return old.response_snapshot;}}
   }
   // Lock user before challenge, matching authenticated mutations and revocations.
   const owner=(await db.query('SELECT user_id FROM auth_challenges WHERE id=$1',[b.challenge_id])).rows[0]?.user_id;
   if(owner)await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[owner]);
   const c=await this.consume(db,b,a);if(!c)return null;
   const u=(await db.query('SELECT id,display_name,status,locale,version FROM users WHERE id=$1',[c.user_id])).rows[0];
   if(!u||!['active','suspended'].includes(u.status))return null;
   const contact=this.messages.secrets.decrypt(c.contact_cipher);this.messages.requireContact(contact);
   if(b.purpose==='identity'&&c.user_version!==null&&c.user_version!==u.version)return 'VERSION_CONFLICT';
   if(['login','reset'].includes(b.purpose)&&!(await db.query('SELECT 1 FROM identities WHERE user_id=$1 AND provider=$2 AND subject=$3 AND verified_at IS NOT NULL',[u.id,c.provider,contact])).rowCount)return null;
   if(b.purpose==='recovery'){
    const r=(await db.query('SELECT * FROM account_recoveries WHERE id=$1 FOR UPDATE',[c.recovery_id])).rows[0];
    if(!r||r.state!=='approved'||!receipt||r.receipt_hash!==this.messages.secrets.hash(receipt))return null;

   }
   // Expensive password work starts only after the challenge and recovery proof
   // are valid. Otherwise anonymous requests can monopolize both scrypt slots.
   const hash=b.new_password?await hashPassword(b.new_password):null;
   if(['identity','recovery'].includes(b.purpose)){
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[c.contact_hash]);
    const existing=(await db.query('SELECT user_id FROM identities WHERE provider=$1 AND subject=$2',[c.provider,contact])).rows[0];
    if(existing&&existing.user_id!==u.id)return 'IDENTITY_CONFLICT';
    await db.query(`INSERT INTO identities(user_id,provider,subject,password_hash,verified_at) VALUES($1,$2,$3,$4,clock_timestamp()) ON CONFLICT(user_id,provider) DO UPDATE SET subject=EXCLUDED.subject,password_hash=COALESCE(EXCLUDED.password_hash,identities.password_hash),verified_at=EXCLUDED.verified_at`,[u.id,c.provider,contact,hash]);
    await db.query('UPDATE users SET version=version+1 WHERE id=$1',[u.id]);
    await this.audit(db,u.id,'account.identity.changed',c.id,'Verified new contact');
   }
   if(b.purpose==='recovery')await db.query("UPDATE account_recoveries SET state='completed',version=version+1 WHERE id=$1",[c.recovery_id]);
   if(hash)await db.query("UPDATE identities SET password_hash=$2 WHERE user_id=$1 AND provider='email'",[u.id,hash]);
   await db.query('UPDATE auth_challenges SET consumed_at=clock_timestamp() WHERE id=$1',[c.id]);
   if(b.purpose==='login')return this.auth.issue(db,u);
   if(b.purpose!=='identity'){await this.revoke(db,u.id);await this.audit(db,u.id,'account.'+b.purpose+'.completed',c.id,'Verified security challenge');}
   const response={id:c.id,version:1,state:'completed'};
   if(key&&a)await db.query("INSERT INTO idempotency_keys(actor_id,operation,request_key,request_hash,state,response_snapshot) VALUES($1,'confirmIdentityChange',$2,$3,'completed',$4)",[a.user.id,key,this.messages.secrets.hash(JSON.stringify(b)),JSON.stringify(response)]);
   return response;
  });
  await this.auth.accessChanged();
  if(!result)throw new BadRequestException({code:'CHALLENGE_INVALID'});if(typeof result==='string')throw new ConflictException({code:result});return result;
 }
 async changePassword(header:string|undefined,b:ReturnType<typeof Input.changePassword>,ip:string){
  const result=await this.tx(async db=>{const a=await this.actor(db,header);if(!await this.proof(db,a,b.password,ip))return null;const hash=await hashPassword(b.new_password);await db.query("UPDATE identities SET password_hash=$2 WHERE user_id=$1 AND provider='email'",[a.user.id,hash]);await this.revoke(db,a.user.id);await this.audit(db,a.user.id,'account.password.changed',a.user.id,'Fresh current-password proof');return {id:a.user.id,version:1,state:'completed'};});
  await this.auth.accessChanged();if(!result)throw new ForbiddenException({code:'REAUTH_REQUIRED'});return result;
 }
 async recover(b:ReturnType<typeof Input.recovery>,ip:string,suppliedReceipt?:string){
  this.messages.requireContact(b.next.contact);if(suppliedReceipt&&!/^[a-f0-9]{64}$/.test(suppliedReceipt))throw new BadRequestException();const receipt=suppliedReceipt??randomBytes(32).toString('hex'),requestHash=this.messages.secrets.hash(JSON.stringify(b));
  const row=await this.tx(async db=>{
   const receiptHash=this.messages.secrets.hash(receipt);await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[receiptHash]);
   const previous=(await db.query('SELECT id,state,version,request_hash FROM account_recoveries WHERE receipt_hash=$1',[receiptHash])).rows[0];if(previous){if(previous.request_hash!==requestHash)throw new ConflictException({code:'IDEMPOTENCY_MISMATCH'});return {id:previous.id,state:previous.state,version:previous.version};}
   await this.rate(db,b.old.contact,ip,'recovery');const user=(await db.query('SELECT user_id FROM identities WHERE provider=$1 AND subject=$2',[b.old.provider,b.old.contact])).rows[0]?.user_id??null;
   return (await db.query(`INSERT INTO account_recoveries(user_id,receipt_hash,contact_cipher,contact_hash,evidence_cipher,request_hash) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,state,version`,[user,this.messages.secrets.hash(receipt),this.messages.secrets.encrypt(b.next.contact),this.messages.secrets.hash(b.next.contact),this.messages.secrets.encrypt(b.evidence),requestHash])).rows[0];});
  return {...row,receipt_token:receipt};
 }
 private async receipt(db:PoolClient,id:string,token:string|undefined){if(!token||!/^[a-f0-9]{64}$/.test(token))throw new NotFoundException();const r=(await db.query('SELECT * FROM account_recoveries WHERE id=$1 AND receipt_hash=$2 FOR UPDATE',[id,this.messages.secrets.hash(token)])).rows[0];if(!r)throw new NotFoundException();return r;}
 recoveryStatus(id:string,token:string|undefined){return this.tx(async db=>{const r=await this.receipt(db,id,token);return {id:r.id,state:r.state,version:r.version,reason:r.reason};});}
 supplement(id:string,token:string|undefined,evidence:string){return this.tx(async db=>{const r=await this.receipt(db,id,token);if(!['pending','awaiting_evidence'].includes(r.state))throw new ConflictException({code:'STATE_CONFLICT'});await db.query('INSERT INTO account_recovery_supplements(recovery_id,evidence_cipher) VALUES($1,$2)',[id,this.messages.secrets.encrypt(evidence)]);await db.query("UPDATE account_recoveries SET state='pending',version=version+1 WHERE id=$1",[id]);return {id,version:r.version+1,state:'pending'};});}
 recoveryChallenge(id:string,token:string|undefined,ip:string){return this.tx(async db=>{const r=await this.receipt(db,id,token);if(r.state!=='approved'||!r.user_id)throw new ConflictException({code:'STATE_CONFLICT'});const contact=this.messages.secrets.decrypt(r.contact_cipher);this.messages.requireContact(contact);await this.rate(db,contact,ip,'recovery-verify',r.user_id);return this.issue(db,r.user_id,contact.startsWith('+')?'phone':'email',contact,'recovery',null,id);});}
 async obligations(db:PoolClient,user:string,forfeit=false){
  // Lock memberships before reading assignments. Assignment holds a membership SHARE lock:
  // either its commit is visible to the next obligation query or it rechecks inactive after deletion.
  await db.query('SELECT id FROM partners WHERE id IN (SELECT partner_id FROM memberships WHERE user_id=$1) ORDER BY id FOR UPDATE',[user]);
  await db.query('SELECT id FROM memberships WHERE user_id=$1 ORDER BY id FOR UPDATE',[user]);
  // Target user lock serializes every account mutation. Financial locks protect balance/holds.
  const accounts=(await db.query('SELECT * FROM ledger_accounts WHERE owner_user_id=$1 ORDER BY id FOR UPDATE',[user])).rows;
  const reasons:string[]=[];
  const checks:[string,string][]=[
   ['OWNER',"SELECT 1 FROM memberships WHERE user_id=$1 AND active AND is_owner"],
   ['ADMIN',"SELECT 1 FROM admin_grants WHERE user_id=$1 AND revoked_at IS NULL"],
   ['JOB',"SELECT 1 FROM jobs j WHERE (j.customer_id=$1 OR EXISTS(SELECT 1 FROM assignments a JOIN memberships m ON m.id=a.membership_id WHERE a.job_id=j.id AND m.user_id=$1 AND a.ended_at IS NULL)) AND j.state IN ('requested','accepted','awaiting_settlement')"],
   ['INVOICE',"SELECT 1 FROM invoices i JOIN jobs j ON j.id=i.job_id WHERE j.customer_id=$1 AND i.state<>'settled'"],
   ['REPORT',"SELECT 1 FROM reports WHERE (reporter_id=$1 OR assignee_id=$1) AND state NOT IN ('resolved','closed')"],
   ['HOLD',"SELECT 1 FROM holds h JOIN ledger_accounts l ON l.id=h.account_id WHERE l.owner_user_id=$1 AND h.state='active'"],
   ['TOPUP',"SELECT 1 FROM finance_topups WHERE user_id=$1 AND state='pending'"],
   ['PAYOUT',"SELECT 1 FROM finance_payouts WHERE user_id=$1 AND state IN ('pending','approved','transferring','unknown')"],
   ['BANK',"SELECT 1 FROM bank_change_requests WHERE user_id=$1 AND state='pending'"]
  ];
  for(const [reason,sql] of checks)if((await db.query(sql,[user])).rowCount)reasons.push(reason);
  if(accounts.some(x=>BigInt(x.balance)<0n||BigInt(x.balance)>0n&&!forfeit))reasons.push('BALANCE');
  return {blocked:reasons.length>0,reasons,points:accounts.reduce((s,x)=>s+BigInt(x.balance),0n).toString()};
 }
 deletionPreview(header:string|undefined){return this.tx(async db=>{const a=await this.actor(db,header);return this.obligations(db,a.user.id);});}
 async requestDeletion(header:string|undefined,b:ReturnType<typeof Input.deletion>,ip:string,key?:string){this.messages.requireConfigured();const result=await this.tx(async db=>{const a=await this.actor(db,header);if(!await this.proof(db,a,b.password,ip))return {error:'REAUTH_REQUIRED'};
   if(key){const old=(await db.query("SELECT request_hash,response_snapshot FROM idempotency_keys WHERE actor_id=$1 AND operation='requestDeletion' AND request_key=$2",[a.user.id,key])).rows[0];if(old){if(old.request_hash!==this.messages.secrets.hash(JSON.stringify(b)))throw new ConflictException({code:'IDEMPOTENCY_MISMATCH'});return old.response_snapshot;}}
   const existing=(await db.query("SELECT id,state,version FROM account_deletions WHERE user_id=$1 AND state='pending'",[a.user.id])).rows[0];if(existing)return existing;
   if(a.user.version!==b.expected_version)throw new ConflictException({code:'VERSION_CONFLICT'});
   const o=await this.obligations(db,a.user.id,b.forfeit_points);if(o.blocked)throw new ConflictException({code:'OBLIGATIONS_PENDING',...o});
   const response=(await db.query('INSERT INTO account_deletions(user_id,forfeit_points,request_cipher) VALUES($1,$2,$3) RETURNING id,state,version',[a.user.id,b.forfeit_points,this.messages.secrets.encrypt(b.reason)])).rows[0];
   if(key)await db.query("INSERT INTO idempotency_keys(actor_id,operation,request_key,request_hash,state,response_snapshot) VALUES($1,'requestDeletion',$2,$3,'completed',$4)",[a.user.id,key,this.messages.secrets.hash(JSON.stringify(b)),JSON.stringify(response)]);return response;});if('error' in result)throw new ForbiddenException({code:result.error});return result;}
 async queue(header:string|undefined,mfa:string|undefined,domain:'recoveries'|'deletions',query:ReturnType<typeof Input.queueInput>){
  return this.admin.read(header,mfa,'accounts.manage',async(db,a)=>{
   const scope=`account-queue:${a.user.id}:${domain}:${query.state}`,position=this.cursor.decode(query.cursor,scope);
   const rows=(await db.query(`SELECT id,user_id,state,version,date_trunc('milliseconds',created_at) AS created_at FROM account_${domain} WHERE ($1='all' OR state IN ('pending','awaiting_evidence')) AND ($2::timestamptz IS NULL OR (date_trunc('milliseconds',created_at),id)<($2,$3::uuid)) ORDER BY date_trunc('milliseconds',created_at) DESC,id DESC LIMIT $4`,[query.state,position?.created_at??null,position?.id??null,query.limit+1])).rows;
   const items=rows.slice(0,query.limit),last=items.at(-1);await this.audit(db,a.user.id,'account.'+domain+'.list',a.user.id,'Read account queue');
   return {items,next_cursor:rows.length>query.limit&&last?this.cursor.encode({id:last.id,created_at:last.created_at.toISOString()},scope):null};
  });
 }
 adminDetail(header:string|undefined,mfa:string|undefined,domain:'recoveries'|'deletions',id:string){return this.admin.read(header,mfa,'accounts.manage',async db=>{const r=(await db.query(`SELECT * FROM account_${domain} WHERE id=$1`,[id])).rows[0];if(!r)throw new NotFoundException();await this.audit(db,(await this.auth.authenticate(header,db)).user.id,'account.'+domain+'.read',id,'Đọc hồ sơ');return domain==='recoveries'?{id:r.id,user_id:r.user_id,state:r.state,version:r.version,contact:this.messages.secrets.decrypt(r.contact_cipher),evidence:[this.messages.secrets.decrypt(r.evidence_cipher),...(await db.query('SELECT evidence_cipher FROM account_recovery_supplements WHERE recovery_id=$1 ORDER BY created_at,id',[id])).rows.map(s=>this.messages.secrets.decrypt(s.evidence_cipher))].join('\n\n'),reason:r.reason}:{id:r.id,user_id:r.user_id,forfeit_points:r.forfeit_points,state:r.state,version:r.version,reviewer_id:r.reviewer_id,reason:r.reason,created_at:r.created_at,application_reason:this.messages.secrets.decrypt(r.request_cipher),obligations:await this.obligations(db,r.user_id,r.forfeit_points)};});}
 private audit(db:PoolClient,actor:string,action:string,id:string,reason:string){return db.query('INSERT INTO audit_events(actor_id,action,resource_id,reason) VALUES($1,$2,$3,$4)',[actor,action,id,reason]);}
 async decide(header:string|undefined,mfa:string|undefined,domain:'recoveries'|'deletions',id:string,b:ReturnType<typeof Input.decision>,key?:string){
  this.messages.requireConfigured();
  const result=await this.admin.transaction(header,async(db,a)=>{
   await this.admin.check(db,a,mfa,'accounts.manage',true);
   const requestHash=this.messages.secrets.hash(JSON.stringify({id,...b})),operation='account.'+domain+'.decision';
   if(key){const old=(await db.query('SELECT request_hash,response_snapshot FROM idempotency_keys WHERE actor_id=$1 AND operation=$2 AND request_key=$3',[a.user.id,operation,key])).rows[0];if(old){if(old.request_hash!==requestHash)throw new ConflictException({code:'IDEMPOTENCY_MISMATCH'});return old.response_snapshot;}}
   const target=(await db.query(`SELECT user_id FROM account_${domain} WHERE id=$1`,[id])).rows[0];if(!target)throw new NotFoundException();
   if(target.user_id===a.user.id)throw new ForbiddenException();
   if(target.user_id)await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[target.user_id]);
   const r=(await db.query(`SELECT * FROM account_${domain} WHERE id=$1 FOR UPDATE`,[id])).rows[0];
   if(r.version!==b.expected_version)throw new ConflictException({code:'VERSION_CONFLICT'});
   if(!['pending','awaiting_evidence'].includes(r.state))throw new ConflictException({code:'STATE_CONFLICT'});
   if(domain==='recoveries'&&b.action==='approve'&&!r.user_id)throw new ConflictException({code:'STATE_CONFLICT'});
   if(domain==='deletions'&&b.action==='evidence')throw new BadRequestException();
   if(domain==='deletions'&&b.action==='approve'){
    const o=await this.obligations(db,r.user_id,r.forfeit_points);if(o.blocked)throw new ConflictException({code:'OBLIGATIONS_PENDING',...o});
    const p=(await db.query("SELECT * FROM ledger_accounts WHERE owner_user_id=$1 AND unit='POINT'",[r.user_id])).rows[0];
    if(p&&BigInt(p.balance)>0n){
     await db.query("INSERT INTO ledger_accounts(system_code,unit) VALUES('account_forfeiture','POINT') ON CONFLICT(system_code,unit) DO NOTHING");
     const system=(await db.query("SELECT id FROM ledger_accounts WHERE system_code='account_forfeiture' AND unit='POINT' FOR UPDATE")).rows[0];
     const tx=(await db.query("INSERT INTO ledger_transactions(operation_key,kind,actor_id,correlation_id) VALUES($1,'point_forfeiture',$2,$3) RETURNING id",['deletion:'+id,a.user.id,id])).rows[0];
     for(const [account,amount] of [[p.id,'-'+p.balance],[system.id,p.balance]])await db.query("INSERT INTO ledger_entries(transaction_id,account_id,unit,delta,posting_code) VALUES($1,$2,'POINT',$3,'account_deletion')",[tx.id,account,amount]);
    }
    await this.revoke(db,r.user_id);
    await db.query("UPDATE users SET status='anonymized',display_name='Tài khoản đã xóa',anonymized_at=clock_timestamp(),locale='vi',version=version+1 WHERE id=$1",[r.user_id]);
    await db.query('DELETE FROM identities WHERE user_id=$1',[r.user_id]);
    await db.query("UPDATE saved_addresses SET label='Đã xóa',address_text='Đã xóa',point=ST_SetSRID(ST_MakePoint(0,0),4326)::geography,is_default=false,archived_at=COALESCE(archived_at,clock_timestamp()),version=version+1 WHERE user_id=$1",[r.user_id]);
    await db.query("UPDATE membership_grants SET revoked_at=COALESCE(revoked_at,clock_timestamp()) WHERE membership_id IN (SELECT id FROM memberships WHERE user_id=$1)",[r.user_id]);
    await db.query("WITH cleared AS (UPDATE partner_contacts SET membership_id=NULL WHERE membership_id IN (SELECT id FROM memberships WHERE user_id=$1) RETURNING partner_id) UPDATE partners SET version=version+1 WHERE id IN (SELECT partner_id FROM cleared)",[r.user_id]);
    await db.query("UPDATE memberships SET active=false,left_at=clock_timestamp(),version=version+1 WHERE user_id=$1 AND active AND NOT is_owner",[r.user_id]);
   }
   const state=b.action==='approve'?'approved':b.action==='reject'?'rejected':'awaiting_evidence';
   await db.query(`UPDATE account_${domain} SET state=$2,version=version+1,reviewer_id=$3,reason=$4 WHERE id=$1`,[id,state,a.user.id,b.reason]);await this.audit(db,a.user.id,'account.'+domain+'.'+b.action,id,b.reason);
   const response={id,version:r.version+1,state};
   if(key)await db.query("INSERT INTO idempotency_keys(actor_id,operation,request_key,request_hash,state,response_snapshot) VALUES($1,$2,$3,$4,'completed',$5)",[a.user.id,operation,key,requestHash,JSON.stringify(response)]);
   return response;
  });await this.auth.accessChanged();return result;
 }
}
