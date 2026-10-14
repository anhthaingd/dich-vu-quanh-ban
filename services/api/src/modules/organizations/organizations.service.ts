import {BadRequestException,ConflictException,ForbiddenException,NotFoundException,HttpException} from '@nestjs/common';
import {randomBytes} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {AccountTransaction} from '../accounts/account-transaction.js';
import type {AuthService} from '../auth/auth.service.js';
import type {Cursor} from '../../common/http/cursor.js';
import type {LocalMessages} from '../../integrations/local-messages.js';
import {memberAccess,hasPermission} from '../jobs/jobs.access.js';
import {discardUnsentDrafts} from '../invoices/invoice-handover.js';
import {requestContext} from '../../logging/logger.js';
import {event} from '../chat/chat.store.js';
import type {PageInput} from '../accounts/accounts.input.js';
import type {inviteInput,changeInput,grantsInput,contactEdit,organizationQuery} from './organizations.input.js';
type Query=ReturnType<typeof organizationQuery>;
const conflict=()=>new ConflictException({code:'STATE_CONFLICT'});
export class OrganizationsService {
 private readonly tx:AccountTransaction;
 constructor(private readonly pool:Pool,private readonly auth:AuthService,private readonly cursor:Cursor,private readonly messages:LocalMessages){this.tx=new AccountTransaction(pool,auth);}
 private async access(db:PoolClient,partner:string,user:string){
  const p=(await db.query('SELECT * FROM partners WHERE id=$1 AND archived_at IS NULL FOR UPDATE',[partner])).rows[0];
  const m=await memberAccess(db,partner,user);if(!p||p.kind==='solo'||!hasPermission(m,'members.manage'))throw new NotFoundException();return {p,m:m!};
 }
 private async member(db:PoolClient,id:string){const m=(await db.query(`SELECT m.*,u.display_name,ARRAY(SELECT permission FROM membership_grants WHERE membership_id=m.id AND revoked_at IS NULL ORDER BY permission) AS permissions FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.id=$1`,[id])).rows[0];if(!m)throw new NotFoundException();return m;}
 private dto(m:Awaited<ReturnType<OrganizationsService['member']>>){return {id:m.id,user_id:m.user_id,display_name:m.display_name,active:m.active,is_owner:m.is_owner,permissions:m.permissions,version:m.version};}
 private cas(actual:number,expected:number){if(actual!==expected)throw new ConflictException({code:'VERSION_CONFLICT'});}
 private async audit(db:PoolClient,user:string,partner:string,action:string,id:string,reason='',details:unknown={}){
  await db.query('INSERT INTO audit_events(actor_id,partner_id,action,resource_id,request_id,reason,details) VALUES($1,$2,$3,$4,$5,$6,$7)',[user,partner,action,id,requestContext.getStore()?.request_id??null,reason,JSON.stringify(details)]);
 }
 private async read<T>(header:string|undefined,work:(db:PoolClient,user:string)=>Promise<T>){
  const db=await this.pool.connect();try{await db.query('BEGIN');const a=await this.auth.authenticate(header,db);const value=await work(db,a.user.id);await db.query('COMMIT');return value;}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
 private async summary(db:PoolClient,id:string){
  const i=(await db.query(`SELECT i.id,i.partner_id,i.contact_masked,i.permissions,CASE WHEN i.status='pending' AND i.expires_at<=clock_timestamp() THEN 'expired' ELSE i.status END AS status,i.created_at,i.expires_at,i.version,i.replacement_id,COALESCE(d.state,'failed') AS delivery_state FROM member_invitations i LEFT JOIN local_deliveries d ON d.invitation_id=i.id WHERE i.id=$1`,[id])).rows[0];
  return {...i,created_at:i.created_at.toISOString(),expires_at:i.expires_at.toISOString()};
 }
 private async newInvitation(db:PoolClient,partner:string,user:string,contact:string,provider:string){
  this.messages.requireContact(contact);const hash=this.messages.secrets.hash(contact);
  await db.query("UPDATE member_invitations SET status='expired',version=version+1 WHERE partner_id=$1 AND contact_hash=$2 AND status='pending' AND expires_at<=clock_timestamp()",[partner,hash]);
  if((await db.query("SELECT 1 FROM member_invitations WHERE partner_id=$1 AND contact_hash=$2 AND status='pending'",[partner,hash])).rowCount)throw conflict();
  const recent=(await db.query("SELECT created_at,contact_hash FROM member_invitations WHERE invited_by=$1 AND created_at>clock_timestamp()-interval '1 hour'",[user])).rows;
  if(recent.length>=20||recent.filter(r=>r.contact_hash===hash).length>=5||recent.some(r=>r.contact_hash===hash&&r.created_at>new Date(Date.now()-60000)))throw new HttpException({code:'RATE_LIMITED'},429);
  const token=randomBytes(32).toString('hex'),masked=provider==='email'?contact[0]+'***@'+contact.split('@')[1]:contact.slice(0,3)+'***'+contact.slice(-2);
  const i=(await db.query(`INSERT INTO member_invitations(partner_id,invited_by,provider,contact_hash,contact_cipher,contact_masked,token_hash,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,clock_timestamp()+interval '7 days') RETURNING id,expires_at`,[partner,user,provider,hash,this.messages.secrets.encrypt(contact),masked,this.messages.secrets.hash(token)])).rows[0];
  await this.messages.queue(db,'invitation',i.id,{contact,subject:'Lời mời tham gia đội ngũ — DEMO',text:`Lời mời có hiệu lực 7 ngày. Mở app, đăng nhập đúng liên hệ đã xác minh, chọn Đội ngũ → Nhận lời mời và dán mã sau:\n${token}\nChỉ xác nhận nếu bạn muốn tham gia.`},i.expires_at);
  await this.audit(db,user,partner,'invitation.created',i.id);return {id:i.id,version:1,state:'pending'};
 }
 invite(header:string|undefined,partner:string,input:ReturnType<typeof inviteInput>,key:string){
  return this.tx.run(header,'inviteMember.'+partner,key,{contact_hash:this.messages.secrets.hash(input.contact)},(db,a)=>this.newInvitation(db,partner,a.user.id,input.contact,input.provider),async(db,a)=>{await this.access(db,partner,a.user.id);});
 }
 invitations(header:string|undefined,partner:string,q:Query){return this.read(header,async(db,user)=>{
  await this.access(db,partner,user);const scope=JSON.stringify(['invitations',user,partner,q.filter]),c=this.cursor.decode(q.cursor,scope);
  const rows=(await db.query(`SELECT id,date_trunc('milliseconds',created_at) AS created_at FROM member_invitations WHERE partner_id=$1 AND ($2::text IS NULL OR CASE WHEN status='pending' AND expires_at<=clock_timestamp() THEN 'expired' ELSE status END=$2) AND ($3::timestamptz IS NULL OR (date_trunc('milliseconds',created_at),id)<($3::timestamptz,$4::uuid)) ORDER BY date_trunc('milliseconds',created_at) DESC,id DESC LIMIT $5`,[partner,q.filter??null,c?.created_at??null,c?.id??null,q.limit+1])).rows;
  const page=rows.slice(0,q.limit),last=page.at(-1);return {items:await Promise.all(page.map(i=>this.summary(db,i.id))),next_cursor:rows.length>q.limit?this.cursor.encode({id:last.id,created_at:last.created_at.toISOString()},scope):null};
 });}
 private async invitationAccess(db:PoolClient,id:string,user:string){const i=(await db.query('SELECT * FROM member_invitations WHERE id=$1',[id])).rows[0];if(!i)throw new NotFoundException();await this.access(db,i.partner_id,user);return (await db.query('SELECT * FROM member_invitations WHERE id=$1 FOR UPDATE',[id])).rows[0];}
 invitationChange(header:string|undefined,id:string,action:'resend'|'revoke',input:ReturnType<typeof changeInput>,key:string){
  return this.tx.run(header,`invitation.${id}.${action}`,key,input,async(db,a)=>{
   const i=await this.invitationAccess(db,id,a.user.id);this.cas(i.version,input.expected_version);
   if(action==='revoke'){
    if(i.status!=='pending'||i.expires_at<=new Date())throw conflict();
    await db.query("UPDATE member_invitations SET status='revoked',version=version+1 WHERE id=$1",[id]);
   }else{
    if(!['pending','expired','revoked'].includes(i.status))throw conflict();
    const contact=this.messages.secrets.decrypt(i.contact_cipher);
    if((await db.query('SELECT 1 FROM identities i JOIN memberships m ON m.user_id=i.user_id WHERE i.provider=$1 AND i.subject=$2 AND m.partner_id=$3 AND m.active',[i.provider,contact,i.partner_id])).rowCount)throw conflict();
    await db.query("UPDATE member_invitations SET status='replaced',version=version+1 WHERE id=$1",[id]);
    const next=await this.newInvitation(db,i.partner_id,a.user.id,contact,i.provider);
    await db.query('UPDATE member_invitations SET replacement_id=$2 WHERE id=$1',[id,next.id]);
    await this.audit(db,a.user.id,i.partner_id,'invitation.replaced',id,'',{replacement_id:next.id});return this.summary(db,next.id);
   }
   await this.audit(db,a.user.id,i.partner_id,'invitation.revoked',id,input.reason);return this.summary(db,id);
  },async(db,a)=>{await this.invitationAccess(db,id,a.user.id);});
 }
 private async acceptance(db:PoolClient,hash:string,user:string){
  let i=(await db.query('SELECT * FROM member_invitations WHERE token_hash=$1',[hash])).rows[0];if(!i)throw new NotFoundException();
  const p=(await db.query('SELECT * FROM partners WHERE id=$1 AND archived_at IS NULL FOR UPDATE',[i.partner_id])).rows[0];if(!p)throw new NotFoundException();
  i=(await db.query('SELECT * FROM member_invitations WHERE id=$1 FOR UPDATE',[i.id])).rows[0];
  const contact=this.messages.secrets.decrypt(i.contact_cipher);
  if(!(await db.query('SELECT 1 FROM identities WHERE user_id=$1 AND provider=$2 AND subject=$3 AND verified_at IS NOT NULL',[user,i.provider,contact])).rowCount)throw new NotFoundException();
  if(!hasPermission(await memberAccess(db,i.partner_id,i.invited_by),'members.manage'))throw new ForbiddenException();
  if(i.status==='accepted'){
   if(i.accepted_by!==user||!await memberAccess(db,i.partner_id,user))throw new ForbiddenException();
  }else if(i.status!=='pending'||i.expires_at<=new Date())throw conflict();
  return i;
 }
 accept(header:string|undefined,token:string,key:string){const hash=this.messages.secrets.hash(token);
  return this.tx.run(header,'acceptInvitation',key,{token_hash:hash},async(db,a)=>{
   const i=await this.acceptance(db,hash,a.user.id);if(i.status!=='pending')throw conflict();
   if(await memberAccess(db,i.partner_id,a.user.id))throw conflict();
   const m=(await db.query(`INSERT INTO memberships(partner_id,user_id) VALUES($1,$2) ON CONFLICT(partner_id,user_id) DO UPDATE SET active=true,left_at=NULL,version=memberships.version+1 RETURNING id`,[i.partner_id,a.user.id])).rows[0];
   await db.query('UPDATE membership_grants SET revoked_at=COALESCE(revoked_at,clock_timestamp()) WHERE membership_id=$1',[m.id]);
   await db.query("UPDATE member_invitations SET status='accepted',accepted_by=$2,version=version+1 WHERE id=$1",[i.id,a.user.id]);
   await this.audit(db,a.user.id,i.partner_id,'membership.joined',m.id);return this.dto(await this.member(db,m.id));
  },async(db,a)=>{await this.acceptance(db,hash,a.user.id);});
 }
 mine(header:string|undefined,q:Query){return this.read(header,async(db,user)=>{
  const scope=JSON.stringify(['memberships',user,q.filter]),c=this.cursor.decode(q.cursor,scope);
  const rows=(await db.query(`SELECT m.id,m.partner_id,p.name AS partner_name,p.kind AS partner_kind,m.is_owner,m.active,m.version,m.left_at,date_trunc('milliseconds',m.created_at) AS created_at,ARRAY(SELECT permission FROM membership_grants WHERE membership_id=m.id AND revoked_at IS NULL ORDER BY permission) AS permissions FROM memberships m JOIN partners p ON p.id=m.partner_id WHERE m.user_id=$1 AND ($2::boolean IS NULL OR m.active=$2) AND ($3::timestamptz IS NULL OR (date_trunc('milliseconds',m.created_at),m.id)<($3::timestamptz,$4::uuid)) ORDER BY date_trunc('milliseconds',m.created_at) DESC,m.id DESC LIMIT $5`,[user,q.filter??null,c?.created_at??null,c?.id??null,q.limit+1])).rows;
  const page=rows.slice(0,q.limit),last=page.at(-1);return {items:page.map(({created_at,left_at,...m})=>{void created_at;return {...m,left_at:left_at?.toISOString()??null};}),next_cursor:rows.length>q.limit?this.cursor.encode({id:last.id,created_at:last.created_at.toISOString()},scope):null};
 });}
 private async target(db:PoolClient,id:string,user:string,self=false){
  const ref=await this.member(db,id);await db.query('SELECT id FROM partners WHERE id=$1 FOR UPDATE',[ref.partner_id]);
  const m=await this.member(db,id);
  if(self?m.user_id!==user:!hasPermission(await memberAccess(db,m.partner_id,user),'members.manage'))throw new NotFoundException();
  if(m.is_owner)throw new ForbiddenException();return m;
 }
 grants(header:string|undefined,id:string,input:ReturnType<typeof grantsInput>,key:string){
  const {reauth_grant,...safe}=input,hash=this.messages.secrets.hash(reauth_grant);
  return this.tx.run(header,'editGrants.'+id,key,{...safe,reauth_hash:hash},async(db,a)=>{
   const m=await this.target(db,id,a.user.id);this.cas(m.version,input.expected_version);if(!m.active||m.user_id===a.user.id)throw new ForbiddenException();
   const actor=await memberAccess(db,m.partner_id,a.user.id);
   for(const p of new Set<string>([...m.permissions,...input.permissions]))if(m.permissions.includes(p)!==input.permissions.includes(p)&&!hasPermission(actor,p))throw new ForbiddenException();
   const consumed=await db.query(`UPDATE reauth_grants SET consumed_at=clock_timestamp() WHERE grant_hash=$1 AND user_id=$2 AND family_id=(SELECT family_id FROM sessions WHERE id=$3) AND scope='membership.grants' AND consumed_at IS NULL AND expires_at>clock_timestamp() RETURNING grant_hash`,[hash,a.user.id,a.sessionId]);
   if(!consumed.rowCount)throw new ForbiddenException({code:'REAUTH_REQUIRED'});
   await db.query('UPDATE membership_grants SET revoked_at=clock_timestamp() WHERE membership_id=$1 AND revoked_at IS NULL AND NOT(permission=ANY($2::text[]))',[id,input.permissions]);
   for(const p of input.permissions)await db.query('INSERT INTO membership_grants(membership_id,permission,granted_by) VALUES($1,$2,$3) ON CONFLICT(membership_id,permission) WHERE revoked_at IS NULL DO NOTHING',[id,p,a.user.id]);
   await db.query('UPDATE memberships SET version=version+1 WHERE id=$1',[id]);
   await this.audit(db,a.user.id,m.partner_id,'membership.grants',id,input.reason,{before:m.permissions,after:input.permissions});return this.dto(await this.member(db,id));
  },async(db,a)=>{const m=await this.target(db,id,a.user.id);if(!m.active||m.user_id===a.user.id)throw new ForbiddenException();});
 }
 preview(header:string|undefined,id:string,q:PageInput){return this.read(header,async(db,user)=>{
  const ref=await this.member(db,id),m=await this.target(db,id,user,ref.user_id===user);const scope=JSON.stringify(['departure',user,id,m.version]),c=this.cursor.decode(q.cursor,scope);
  const rows=(await db.query(`SELECT j.id,j.state,j.version,date_trunc('milliseconds',j.created_at) AS created_at,count(*) OVER() AS total FROM assignments a JOIN jobs j ON j.id=a.job_id LEFT JOIN invoices i ON i.job_id=j.id WHERE a.membership_id=$1 AND a.ended_at IS NULL AND i.worker_receipt_confirmed_at IS NULL ORDER BY date_trunc('milliseconds',j.created_at),j.id`,[id])).rows;
  const remaining=rows.filter(r=>!c||r.created_at.toISOString()>c.created_at||r.created_at.toISOString()===c.created_at&&r.id>c.id),page=remaining.slice(0,q.limit),last=page.at(-1);
  return {membership_version:m.version,total:rows.length,items:page.map(r=>({id:r.id,state:r.state,version:r.version})),next_cursor:remaining.length>q.limit?this.cursor.encode({id:last.id,created_at:last.created_at.toISOString()},scope):null};
 });}
 departure(header:string|undefined,id:string,action:'leave'|'deactivate',input:ReturnType<typeof changeInput>,key:string){
  return this.tx.run(header,`membership.${id}.${action}`,key,input,async(db,a)=>{
   const m=await this.target(db,id,a.user.id,action==='leave');this.cas(m.version,input.expected_version);if(!m.active)throw conflict();
   const jobs=(await db.query('SELECT j.id,j.version FROM jobs j JOIN assignments a ON a.job_id=j.id WHERE a.membership_id=$1 AND a.ended_at IS NULL ORDER BY j.id FOR UPDATE OF j',[id])).rows,handed:string[]=[];
   for(const j of jobs){
    const i=(await db.query('SELECT worker_receipt_confirmed_at FROM invoices WHERE job_id=$1 FOR UPDATE',[j.id])).rows[0];if(i?.worker_receipt_confirmed_at)continue;
    await discardUnsentDrafts(db,j.id);await db.query('UPDATE assignments SET ended_at=clock_timestamp() WHERE job_id=$1 AND ended_at IS NULL',[j.id]);
    await db.query('UPDATE jobs SET version=version+1 WHERE id=$1',[j.id]);handed.push(j.id);
    await event(db,`job:${j.id}:${j.version+1}:unassigned`,j.id,j.version+1,'job.unassigned.v1',{job_id:j.id,membership_id:id});
   }
   await db.query('UPDATE memberships SET active=false,left_at=clock_timestamp(),version=version+1 WHERE id=$1',[id]);
   await db.query('UPDATE membership_grants SET revoked_at=clock_timestamp() WHERE membership_id=$1 AND revoked_at IS NULL',[id]);
   const reset=await db.query('UPDATE partner_contacts SET membership_id=NULL WHERE partner_id=$1 AND membership_id=$2',[m.partner_id,id]);if(reset.rowCount)await db.query('UPDATE partners SET version=version+1 WHERE id=$1',[m.partner_id]);
   await this.audit(db,a.user.id,m.partner_id,'membership.'+action,id,input.reason,{jobs:handed,permissions_before:m.permissions});
   const result=this.dto(await this.member(db,id));return action==='leave'?{id,version:result.version,state:'left'}:result;
  },async(db,a)=>{await this.target(db,id,a.user.id,action==='leave');});
 }
 callContact(header:string|undefined,partner:string){return this.read(header,async(db,user)=>{
  const {p}=await this.access(db,partner,user);return {partner_id:partner,membership_id:(await db.query('SELECT membership_id FROM partner_contacts WHERE partner_id=$1',[partner])).rows[0]?.membership_id??null,version:p.version};
 });}
 setContact(header:string|undefined,partner:string,input:ReturnType<typeof contactEdit>,key:string){return this.tx.run(header,'setCallContact.'+partner,key,input,async(db,a)=>{
  const {p}=await this.access(db,partner,a.user.id);this.cas(p.version,input.expected_version);
  if(input.membership_id&&!(await db.query('SELECT 1 FROM memberships WHERE id=$1 AND partner_id=$2 AND active',[input.membership_id,partner])).rowCount)throw new BadRequestException();
  await db.query('INSERT INTO partner_contacts(partner_id,membership_id) VALUES($1,$2) ON CONFLICT(partner_id) DO UPDATE SET membership_id=EXCLUDED.membership_id',[partner,input.membership_id]);
  await db.query('UPDATE partners SET version=version+1 WHERE id=$1',[partner]);await this.audit(db,a.user.id,partner,'partner.call_contact',partner,'',{membership_id:input.membership_id});return {id:partner,version:p.version+1,state:'updated'};
 },async(db,a)=>{await this.access(db,partner,a.user.id);});}
}
