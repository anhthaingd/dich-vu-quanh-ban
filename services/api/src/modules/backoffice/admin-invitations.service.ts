import {ConflictException,ForbiddenException,HttpException,NotFoundException,ServiceUnavailableException} from '@nestjs/common';
import {createHash,randomBytes} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import type {AuthService} from '../auth/auth.service.js';
import type {AdminAuthService,Actor} from '../admin-auth/admin-auth.service.js';
import type {LocalMessages} from '../../integrations/local-messages.js';
import type {Cursor} from '../../common/http/cursor.js';
import type {PageInput} from '../accounts/accounts.input.js';
import type {adminInvitationInput} from './admin-invitations.input.js';
type Input=ReturnType<typeof adminInvitationInput>;
const conflict=()=>new ConflictException({code:'STATE_CONFLICT'});
export class AdminInvitationsService {
 constructor(private pool:Pool,private auth:AuthService,private admin:AdminAuthService,private messages:LocalMessages,private cursor:Cursor){}
 private async audit(db:PoolClient,actor:string,action:string,id:string,reason:string){await db.query('INSERT INTO audit_events(actor_id,action,resource_id,reason,details) VALUES($1,$2,$3,$4,$5)',[actor,'admin.invitation.'+action,id,reason,'{}']);}
 private async authority(db:PoolClient,user:string,requested:string[]){
  const own=(await db.query("SELECT g.permission FROM admin_grants g JOIN users u ON u.id=g.user_id WHERE g.user_id=$1 AND g.revoked_at IS NULL AND u.status='active'",[user])).rows.map(r=>r.permission);
  if(!own.includes('grant.manage')||requested.some(p=>!own.includes(p)))throw new ForbiddenException();
 }
 private async tx<T>(header:string|undefined,operation:string,key:string,input:unknown,authorize:(db:PoolClient,a:Actor)=>Promise<void>,work:(db:PoolClient,a:Actor)=>Promise<T>){
  const actor=await this.auth.authenticate(header),db=await this.pool.connect(),hash=createHash('sha256').update(JSON.stringify(input)).digest('hex');
  try{await db.query('BEGIN');
   // Same order as saveGrants: authority graph before users or invitation rows.
   await db.query('SELECT pg_advisory_xact_lock(2110202602)');
   await db.query('SELECT id FROM users WHERE id=$1 FOR NO KEY UPDATE',[actor.user.id]);
   const a=await this.auth.authenticate(header,db);await authorize(db,a);
   const prior=(await db.query('SELECT request_hash,response_snapshot FROM idempotency_keys WHERE actor_id=$1 AND operation=$2 AND request_key=$3',[a.user.id,operation,key])).rows[0];
   if(prior&&prior.request_hash!==hash)throw new ConflictException({code:'IDEMPOTENCY_MISMATCH'});
   const result:T=prior?prior.response_snapshot:await work(db,a);
   if(!prior)await db.query("INSERT INTO idempotency_keys(actor_id,operation,request_key,request_hash,state,response_snapshot) VALUES($1,$2,$3,$4,'completed',$5)",[a.user.id,operation,key,hash,JSON.stringify(result)]);
   await db.query('COMMIT');return result;
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();await this.auth.accessChanged();}
 }
 private async summary(db:PoolClient,id:string){const r=(await db.query(`SELECT i.id,i.name,i.contact_masked,i.permissions,i.version,i.created_at,i.expires_at,i.replacement_id,
 CASE WHEN i.status='pending' AND i.expires_at<=clock_timestamp() THEN 'expired' ELSE i.status END AS status,COALESCE(d.state,'failed') AS delivery_state
 FROM admin_invitations i LEFT JOIN local_deliveries d ON d.admin_invitation_id=i.id WHERE i.id=$1`,[id])).rows[0];if(!r)throw new NotFoundException();return {...r,created_at:r.created_at.toISOString(),expires_at:r.expires_at.toISOString()};}
 private async create(db:PoolClient,actor:string,input:Input,allowRegistered=false){
  try{this.messages.requireContact(input.email);}catch{throw new ServiceUnavailableException({code:'LOCAL_CONTACT_NOT_ALLOWED'});}await this.authority(db,actor,input.permissions);
  // New-account invitation is distinct from granting an existing account.
  if(!allowRegistered&&(await db.query("SELECT 1 FROM identities WHERE provider='email' AND subject=$1",[input.email])).rowCount)throw new ConflictException({code:'ACCOUNT_EXISTS'});
  const hash=this.messages.secrets.hash(input.email);
  await db.query("UPDATE admin_invitations SET status='expired',version=version+1 WHERE contact_hash=$1 AND status='pending' AND expires_at<=clock_timestamp()",[hash]);
  if((await db.query("SELECT 1 FROM admin_invitations WHERE contact_hash=$1 AND status='pending'",[hash])).rowCount)throw new ConflictException({code:'INVITATION_PENDING'});
  const recent=(await db.query("SELECT contact_hash,created_at FROM admin_invitations WHERE invited_by=$1 AND created_at>clock_timestamp()-interval '1 hour'",[actor])).rows;
  if(recent.length>=20||recent.filter(r=>r.contact_hash===hash).length>=5||recent.some(r=>r.contact_hash===hash&&r.created_at>new Date(Date.now()-60000)))throw new HttpException({code:'RATE_LIMITED'},429);
  const token=randomBytes(32).toString('hex');
  const i=(await db.query(`INSERT INTO admin_invitations(invited_by,name,contact_hash,contact_cipher,contact_masked,token_hash,permissions,reason,expires_at)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,clock_timestamp()+interval '7 days') RETURNING id,expires_at`,[actor,input.name,hash,this.messages.secrets.encrypt(input.email),input.email[0]+'***@'+input.email.split('@')[1],this.messages.secrets.hash(token),input.permissions,input.reason])).rows[0];
  await this.messages.queue(db,'admin_invitation',i.id,{contact:input.email,subject:'Lời mời quản trị — Dịch vụ quanh bạn',text:`Bạn được mời làm quản trị viên. Lời mời có hiệu lực 7 ngày. Tạo tài khoản và xác minh đúng email nhận thư, sau đó vào Tài khoản → Nhận lời mời quản trị, dán mã:\n${token}\nXem các quyền trước khi nhận. Sau khi nhận, thiết lập/xác minh MFA để vào quản trị.`},i.expires_at);
  await this.audit(db,actor,'created',i.id,input.reason);return this.summary(db,i.id);
 }
 invite(header:string|undefined,mfa:string|undefined,input:Input,key:string){return this.tx(header,'admin.invitation.create',key,{...input,email:this.messages.secrets.hash(input.email)},async(db,a)=>{await this.admin.check(db,a,mfa,'grant.manage');await this.authority(db,a.user.id,input.permissions);},(db,a)=>this.create(db,a.user.id,input));}
 list(header:string|undefined,mfa:string|undefined,q:PageInput){return this.admin.read(header,mfa,'grant.manage',async(db,a)=>{
  const scope='admin-invitations:'+a.user.id,c=this.cursor.decode(q.cursor,scope),rows=(await db.query(`SELECT id,date_trunc('milliseconds',created_at) AS created_at FROM admin_invitations WHERE ($1::timestamptz IS NULL OR (date_trunc('milliseconds',created_at),id)<($1::timestamptz,$2::uuid)) ORDER BY date_trunc('milliseconds',created_at) DESC,id DESC LIMIT $3`,[c?.created_at??null,c?.id??null,q.limit+1])).rows;
  const page=rows.slice(0,q.limit),last=page.at(-1);await this.audit(db,a.user.id,'list',a.user.id,'Read invitation queue');return {items:await Promise.all(page.map(r=>this.summary(db,r.id))),next_cursor:rows.length>q.limit?this.cursor.encode({id:last.id,created_at:last.created_at.toISOString()},scope):null};
 });}
 change(header:string|undefined,mfa:string|undefined,id:string,action:'resend'|'revoke',input:{expected_version:number;reason:string},key:string){return this.tx(header,'admin.invitation.'+action+':'+id,key,input,async(db,a)=>{await this.admin.check(db,a,mfa,'grant.manage');const i=(await db.query('SELECT permissions FROM admin_invitations WHERE id=$1',[id])).rows[0];if(!i)throw new NotFoundException();await this.authority(db,a.user.id,i.permissions);},async(db,a)=>{
  const i=(await db.query('SELECT * FROM admin_invitations WHERE id=$1 FOR UPDATE',[id])).rows[0];if(i.version!==input.expected_version)throw new ConflictException({code:'VERSION_CONFLICT'});
  if(!['pending','expired'].includes(i.status))throw conflict();
  await db.query("UPDATE admin_invitations SET status=$2,version=version+1 WHERE id=$1",[id,action==='resend'?'replaced':'revoked']);
  await db.query("UPDATE local_deliveries SET payload_cipher=NULL,state=CASE WHEN state='submitted' THEN state ELSE 'failed' END WHERE admin_invitation_id=$1",[id]);
  if(action==='resend'){
   const next=await this.create(db,a.user.id,{name:i.name,email:this.messages.secrets.decrypt(i.contact_cipher),permissions:i.permissions,reason:input.reason},true);
   await db.query('UPDATE admin_invitations SET replacement_id=$2 WHERE id=$1',[id,next.id]);await this.audit(db,a.user.id,'replaced',id,input.reason);return next;
  }await this.audit(db,a.user.id,'revoked',id,input.reason);return this.summary(db,id);
 });}
 private async recipient(db:PoolClient,user:string,token:string,allowAccepted=false){
  const i=(await db.query('SELECT * FROM admin_invitations WHERE token_hash=$1 FOR UPDATE',[this.messages.secrets.hash(token)])).rows[0];if(!i)throw new NotFoundException();
  if(!(await db.query("SELECT 1 FROM identities WHERE user_id=$1 AND provider='email' AND subject=$2 AND verified_at IS NOT NULL",[user,this.messages.secrets.decrypt(i.contact_cipher)])).rowCount)throw new NotFoundException();
  await this.authority(db,i.invited_by,i.permissions);
  if(allowAccepted&&i.status==='accepted'&&i.accepted_by===user)return i;
  if(i.status!=='pending'||i.expires_at<=new Date())throw conflict();return i;
 }
 preview(header:string|undefined,token:string){return this.admin.transaction(header,async(db,a)=>{const i=await this.recipient(db,a.user.id,token);return {id:i.id,name:i.name,permissions:i.permissions,expires_at:i.expires_at.toISOString()};});}
 accept(header:string|undefined,token:string,key:string){return this.tx(header,'admin.invitation.accept',key,{token_hash:this.messages.secrets.hash(token)},async(db,a)=>{await this.recipient(db,a.user.id,token,true);},async(db,a)=>{
  const i=await this.recipient(db,a.user.id,token);if((await db.query('SELECT 1 FROM admin_grants WHERE user_id=$1 AND revoked_at IS NULL',[a.user.id])).rowCount)throw conflict();
  for(const permission of i.permissions)await db.query('INSERT INTO admin_grants(user_id,permission) VALUES($1,$2)',[a.user.id,permission]);
  await db.query('UPDATE users SET version=version+1 WHERE id=$1',[a.user.id]);await db.query('UPDATE admin_sessions SET revoked_at=COALESCE(revoked_at,clock_timestamp()) WHERE user_id=$1',[a.user.id]);
  await db.query("UPDATE admin_invitations SET status='accepted',accepted_by=$2,version=version+1 WHERE id=$1",[i.id,a.user.id]);
  await this.audit(db,a.user.id,'accepted',i.id,'Recipient accepted verified email invitation');return {id:i.id,status:'accepted',requires_mfa:true};
 });}
}
