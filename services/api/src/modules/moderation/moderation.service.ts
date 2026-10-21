import {event} from '../../common/events/event.store.js';
import {ConflictException,NotFoundException,BadRequestException} from '@nestjs/common';
import type {Pool,PoolClient} from 'pg';
import {AuthService} from '../auth/auth.service.js';
import {AdminAuthService} from '../admin-auth/admin-auth.service.js';
import {AccountTransaction} from '../accounts/account-transaction.js';
import type {PageInput} from '../accounts/accounts.input.js';
import {Cursor} from '../../common/http/cursor.js';
import {SupportService} from '../support/support.service.js';
import {reviewDto} from '../reviews/reviews.service.js';
import {decisionHistory,recordDecision} from './history.js';
import type {Domain,decisionInput,queueInput,noteInput} from './moderation.input.js';
export class ModerationService {
 private readonly tx:AccountTransaction;
 constructor(private readonly pool:Pool,private readonly auth:AuthService,private readonly admin:AdminAuthService,private readonly cursor:Cursor,private readonly support:SupportService){this.tx=new AccountTransaction(pool,auth);}
 permission(d:Domain,write=false){return d==='reports'?(write?'support.manage':'support.read'):'moderation.manage';}
 async detail(db:PoolClient,d:Domain,id:string){
  // d is a controller-validated enum, never arbitrary SQL input.
  const table=d==='verifications'?'verification_requests':d;
  const r=(await db.query(`SELECT * FROM ${table} WHERE id=$1`,[id])).rows[0];if(!r)throw new NotFoundException();
  const history=await decisionHistory(db,d,id);
  if(d==='reports')return {...await this.support.dto(db,r),internal_notes:(await db.query("SELECT id,actor_id,body,created_at FROM report_updates WHERE report_id=$1 AND visibility='admin_only' ORDER BY created_at,id",[id])).rows.map(n=>({...n,created_at:n.created_at.toISOString()})),reporter_id:r.reporter_id,reporter_name:(await db.query('SELECT display_name FROM users WHERE id=$1',[r.reporter_id])).rows[0].display_name,created_at:r.created_at.toISOString(),history};
  if(d==='reviews')return {...reviewDto(r),history};
  const assets=(await db.query('SELECT asset_id FROM verification_assets WHERE request_id=$1 ORDER BY asset_id',[id])).rows;
  const partner=(await db.query('SELECT name FROM partners WHERE id=$1',[r.partner_id])).rows[0];
  return {id:r.id,partner_id:r.partner_id,partner_name:partner.name,kind:r.kind,details:JSON.parse(this.admin.secrets.decrypt(r.private_cipher)),state:r.state,version:r.version,reason:r.reason,created_at:r.created_at.toISOString(),document_asset_ids:assets.map(a=>a.asset_id),history};
 }
 get(header:string|undefined,token:string|undefined,d:Domain,id:string){return this.admin.read(header,token,this.permission(d),async(db,a)=>{const value=await this.detail(db,d,id);await db.query("INSERT INTO audit_events(actor_id,action,resource_id,reason,details) VALUES($1,$2,$3,'Admin detail read','{}')",[a.user.id,`admin.${d}.read`,id]);return value;});}
 list(header:string|undefined,token:string|undefined,d:Domain,q:ReturnType<typeof queueInput>){return this.admin.read(header,token,this.permission(d),async(db,a)=>{
  const valid=d==='reports'?['all','open','reviewing','awaiting_evidence','resolved','closed']:d==='verifications'?['all','pending','awaiting_evidence','approved','rejected']:['all','visible','hidden','removed'];if(!valid.includes(q.state))throw new BadRequestException();
  const scope=`admin:${d}:${a.user.id}:${JSON.stringify([q.q,q.state])}`,after=this.cursor.decode(q.cursor,scope);
  const table=d==='verifications'?'verification_requests':d;
  const name=d==='reports'?"r.subject||' '||r.body||' '||(SELECT display_name FROM users WHERE id=r.reporter_id)":d==='verifications'?"(SELECT name FROM partners WHERE id=r.partner_id)":'r.body';
  const state=d==='reviews'?"CASE WHEN r.removed_at IS NOT NULL THEN 'removed' WHEN r.hidden_at IS NOT NULL THEN 'hidden' ELSE 'visible' END":'r.state';
  const {rows}=await db.query(`SELECT r.id,date_trunc('milliseconds',r.created_at) AS created_at FROM ${table} r
   WHERE ($1='' OR position(lower($1) in lower(r.id::text||' '||${name}))>0)
   AND ($2='all' OR ${state}=$2) AND ($3::timestamptz IS NULL OR (date_trunc('milliseconds',r.created_at),r.id)<($3::timestamptz,$4::uuid))
   ORDER BY date_trunc('milliseconds',r.created_at) DESC,r.id DESC LIMIT $5`,[q.q,q.state,after?.created_at??null,after?.id??null,q.limit+1]);
  const items=rows.slice(0,q.limit),last=items.at(-1);await db.query("INSERT INTO audit_events(actor_id,action,resource_id,reason,details) VALUES($1,$2,$1,'Admin queue read',$3)",[a.user.id,`admin.${d}.list`,JSON.stringify({resource_ids:items.map(r=>r.id)})]);return {items:await Promise.all(items.map(r=>this.detail(db,d,r.id))),next_cursor:rows.length>q.limit?this.cursor.encode({id:last.id,created_at:last.created_at.toISOString()},scope):null};
 });}
 decide(header:string|undefined,token:string|undefined,d:Domain,id:string,input:ReturnType<typeof decisionInput>,key:string){
  return this.tx.run(header,`admin.${d}.decision:${id}`,key,input,async(db,a)=>{
   if(d==='reports'){
    const r=(await db.query('SELECT * FROM reports WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!r)throw new NotFoundException();if(r.version!==input.expected_version)throw new ConflictException({code:'VERSION_CONFLICT'});if(r.state==='closed')throw new ConflictException({code:'STATE_CONFLICT'});
    await db.query('UPDATE reports SET state=$2,version=version+1,assignee_id=$3 WHERE id=$1',[id,input.action,a.user.id]);
    await db.query("INSERT INTO report_updates(report_id,actor_id,body,visibility) VALUES($1,$2,$3,'participants')",[id,a.user.id,input.reason]);
   }else if(d==='reviews'){
    const ref=(await db.query('SELECT j.partner_id,r.job_id FROM reviews r JOIN jobs j ON j.id=r.job_id WHERE r.id=$1',[id])).rows[0];if(!ref)throw new NotFoundException();
    // Same lock order as author edits, replies and job transitions.
    await db.query('SELECT id FROM partners WHERE id=$1 FOR UPDATE',[ref.partner_id]);await db.query('SELECT id FROM jobs WHERE id=$1 FOR UPDATE',[ref.job_id]);
    const r=(await db.query('SELECT version FROM reviews WHERE id=$1 FOR UPDATE',[id])).rows[0];if(r.version!==input.expected_version)throw new ConflictException({code:'VERSION_CONFLICT'});
    await db.query("UPDATE reviews SET hidden_at=CASE WHEN $2='hide' THEN COALESCE(hidden_at,now()) WHEN $2='unhide' THEN NULL ELSE hidden_at END,moderation_reason=$3,version=version+1 WHERE id=$1",[id,input.action,input.reason]);
   }else{
    const ref=(await db.query('SELECT partner_id FROM verification_requests WHERE id=$1',[id])).rows[0];if(!ref)throw new NotFoundException();await db.query('SELECT id FROM partners WHERE id=$1 FOR UPDATE',[ref.partner_id]);
    const r=(await db.query('SELECT * FROM verification_requests WHERE id=$1 FOR UPDATE',[id])).rows[0];if(r.version!==input.expected_version)throw new ConflictException({code:'VERSION_CONFLICT'});if(r.state!=='pending')throw new ConflictException({code:'STATE_CONFLICT'});
    const state=input.action==='approve'?'approved':input.action==='reject'?'rejected':'awaiting_evidence';
    await db.query('UPDATE verification_requests SET state=$2,reason=$3,reviewer_id=$4,version=version+1 WHERE id=$1',[id,state,input.reason,a.user.id]);
    if(r.kind==='identity')await db.query('UPDATE partners SET verification_status=$2,version=version+1 WHERE id=$1',[r.partner_id,state==='approved'?'verified':state==='rejected'?'rejected':'pending']);
   }
   const resource=d==='reports'?'report':d==='verifications'?'verification':'review';await event(db,`${resource}:${id}:${input.expected_version+1}`,id,input.expected_version+1,`${resource}.updated.v1`,{[`${resource}_id`]:id,resource_version:input.expected_version+1});
   await recordDecision(db,d,id,a.user.id,input.action,input.reason,input.expected_version+1);return {cipher:this.admin.secrets.encrypt(JSON.stringify(await this.detail(db,d,id)))};
  },async(db,a)=>{await this.admin.check(db,a,token,this.permission(d,true),true);if(d==='reports')await this.admin.grants(db,a,'support.read');}).then(r=>JSON.parse(this.admin.secrets.decrypt(r.cipher)));
 }
 note(header:string|undefined,token:string|undefined,id:string,input:ReturnType<typeof noteInput>,key:string){
  return this.tx.run(header,`admin.reports.note:${id}`,key,input,async(db,a)=>{
   const r=(await db.query('SELECT * FROM reports WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!r)throw new NotFoundException();
   if(r.version!==input.expected_version)throw new ConflictException({code:'VERSION_CONFLICT'});if(r.state==='closed')throw new ConflictException({code:'STATE_CONFLICT'});
   await db.query("INSERT INTO report_updates(report_id,actor_id,body,visibility) VALUES($1,$2,$3,'admin_only')",[id,a.user.id,input.body]);
   await db.query('UPDATE reports SET version=version+1 WHERE id=$1',[id]);
   // Audit-only administrators must never receive private note content.
   await recordDecision(db,'reports',id,a.user.id,'internal_note','Internal support note',r.version+1);
   return {cipher:this.admin.secrets.encrypt(JSON.stringify(await this.detail(db,'reports',id)))};
  },async(db,a)=>{await this.admin.check(db,a,token,'support.manage',true);await this.admin.grants(db,a,'support.read');}).then(r=>JSON.parse(this.admin.secrets.decrypt(r.cipher)));
 }
 audit(header:string|undefined,token:string|undefined,q:PageInput){return this.admin.read(header,token,'audit.read',async(db,a)=>{
  const scope=`admin:audit:${a.user.id}`,after=this.cursor.decode(q.cursor,scope);
  const {rows}=await db.query(`SELECT id,domain,resource_id,actor_id,action,reason,version,date_trunc('milliseconds',created_at) AS created_at FROM moderation_history
   WHERE ($1::timestamptz IS NULL OR (date_trunc('milliseconds',created_at),id)<($1::timestamptz,$2::uuid)) ORDER BY date_trunc('milliseconds',created_at) DESC,id DESC LIMIT $3`,[after?.created_at??null,after?.id??null,q.limit+1]);const items=rows.slice(0,q.limit),last=items.at(-1);
  return {items:items.map(r=>({...r,created_at:r.created_at.toISOString()})),next_cursor:rows.length>q.limit?this.cursor.encode({id:last.id,created_at:last.created_at.toISOString()},scope):null};
 });}
}
