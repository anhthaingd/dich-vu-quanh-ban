import {BadRequestException,ConflictException,NotFoundException} from '@nestjs/common';
import type {Pool,PoolClient} from 'pg';
import type {AuthService} from '../auth/auth.service.js';
import {AccountTransaction} from '../accounts/account-transaction.js';
import {jobAccess,memberAccess,hasPermission} from '../jobs/jobs.access.js';
import type {PageInput} from '../accounts/accounts.input.js';
import type {Cursor} from '../../common/http/cursor.js';
import type {reportInput,reportReply} from './support.input.js';
type ReportRow={id:string;reporter_id:string;job_id:string|null;invoice_id:string|null;state:string;version:number;kind:string;subject:string;body:string;created_at:Date};
export class SupportService {
 private readonly tx:AccountTransaction;
 constructor(private readonly pool:Pool,private readonly auth:AuthService,private readonly cursor:Cursor){this.tx=new AccountTransaction(pool,auth);}
 private async own(db:PoolClient,id:string,user:string,lock=false):Promise<ReportRow>{
  const r=(await db.query(`SELECT * FROM reports WHERE id=$1 AND reporter_id=$2${lock?' FOR UPDATE':''}`,[id,user])).rows[0];
  if(!r)throw new NotFoundException();return r;
 }
 async dto(db:PoolClient,r:ReportRow){
  const {rows:updates}=await db.query("SELECT id,actor_id,body,visibility,created_at FROM report_updates WHERE report_id=$1 AND visibility='participants' ORDER BY created_at,id",[r.id]);
  const {rows:evidence}=await db.query('SELECT asset_id,update_id FROM report_evidence WHERE report_id=$1 ORDER BY created_at,id',[r.id]);
  return {id:r.id,state:r.state,version:r.version,kind:r.kind,subject:r.subject,body:r.body,job_id:r.job_id,invoice_id:r.invoice_id,evidence_ids:evidence.filter(e=>e.update_id===null).map(e=>e.asset_id),updates:updates.map(u=>({actor_id:u.actor_id,body:u.body,visibility:u.visibility,created_at:u.created_at.toISOString(),evidence_ids:evidence.filter(e=>e.update_id===u.id).map(e=>e.asset_id)}))};
 }
 private async resources(db:PoolClient,input:ReturnType<typeof reportInput>,user:string){
  let job=input.job_id;
  if(input.invoice_id){
   const r=(await db.query('SELECT i.job_id,v.sent_at FROM invoices i JOIN invoice_versions v ON v.invoice_id=i.id WHERE i.id=$1 AND v.id=$2',[input.invoice_id,input.invoice_version_id])).rows[0];
   if(!r||job&&job!==r.job_id)throw new NotFoundException();
   const access=await jobAccess(db,r.job_id,user);
   if(access.customer&&!r.sent_at)throw new NotFoundException();job=r.job_id;
  }else if(input.review_id){
   const r=(await db.query('SELECT r.job_id,j.partner_id FROM reviews r JOIN jobs j ON j.id=r.job_id WHERE r.id=$1',[input.review_id])).rows[0];
   if(!r||job&&job!==r.job_id)throw new NotFoundException();job=r.job_id;
   try{await jobAccess(db,job!,user);}catch(e){
    if(!(e instanceof NotFoundException))throw e;
    const member=await memberAccess(db,r.partner_id,user);
    if(!hasPermission(member,'reviews.write')&&!hasPermission(member,'reviews.respond'))throw e;
   }
  }else if(job)await jobAccess(db,job,user);
  return job;
 }
 private async evidence(db:PoolClient,id:string,ids:string[],user:string,update:string|null=null){
  for(const asset of [...ids].sort()){
   if(!(await db.query("SELECT 1 FROM assets WHERE id=$1 AND uploader_id=$2 AND purpose='evidence' AND status='ready' FOR SHARE",[asset,user])).rowCount)throw new BadRequestException();
   await db.query('INSERT INTO report_evidence(report_id,asset_id,submitted_by,update_id) VALUES($1,$2,$3,$4) ON CONFLICT(report_id,asset_id) DO NOTHING',[id,asset,user,update]);
  }
 }
 private async audit(db:PoolClient,user:string,id:string,action:string,version:number){
  await db.query('INSERT INTO audit_events(actor_id,action,resource_id,details) VALUES($1,$2,$3,$4)',[user,action,id,JSON.stringify({version})]);
 }
 create(header:string|undefined,input:ReturnType<typeof reportInput>,key:string){
  return this.tx.run(header,'createReport',key,input,async(db,a)=>{
   const job=await this.resources(db,input,a.user.id);
   const r=(await db.query('INSERT INTO reports(reporter_id,job_id,invoice_id,invoice_version_id,review_id,kind,body,subject) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[a.user.id,job,input.invoice_id,input.invoice_version_id,input.review_id,input.kind,input.body,input.subject])).rows[0];
   await this.evidence(db,r.id,input.evidence_ids,a.user.id);await this.audit(db,a.user.id,r.id,'report.create',r.version);
   return this.dto(db,r);
  });
 }
 reply(header:string|undefined,id:string,input:ReturnType<typeof reportReply>,key:string){
  return this.tx.run(header,`addReportUpdate:${id}`,key,input,async(db,a)=>{
   const r=await this.own(db,id,a.user.id,true);if(r.state==='closed')throw new ConflictException({code:'STATE_CONFLICT'});
   const update=(await db.query("INSERT INTO report_updates(report_id,actor_id,body,visibility) VALUES($1,$2,$3,'participants') RETURNING id",[id,a.user.id,input.body])).rows[0];
   await this.evidence(db,id,input.evidence_ids,a.user.id,update.id);
   const next=(await db.query("UPDATE reports SET state=CASE WHEN state='awaiting_evidence' THEN 'reviewing' ELSE state END,version=version+1 WHERE id=$1 RETURNING *",[id])).rows[0];
   await this.audit(db,a.user.id,id,'report.update',next.version);return this.dto(db,next);
  },async(db,a)=>{await this.own(db,id,a.user.id);});
 }
 private async read<T>(header:string|undefined,work:(db:PoolClient,user:string)=>Promise<T>){
  const db=await this.pool.connect();try{await db.query('BEGIN');const a=await this.auth.authenticate(header,db);const result=await work(db,a.user.id);await db.query('COMMIT');return result;}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
 get(header:string|undefined,id:string){return this.read(header,async(db,user)=>this.dto(db,await this.own(db,id,user)));}
 list(header:string|undefined,q:PageInput){return this.read(header,async(db,user)=>{
  const scope=`reports:${user}`,after=this.cursor.decode(q.cursor,scope);
  const {rows}=await db.query("SELECT *,date_trunc('milliseconds',created_at) AS created_at FROM reports WHERE reporter_id=$1 AND ($2::timestamptz IS NULL OR (date_trunc('milliseconds',created_at),id)<($2::timestamptz,$3::uuid)) ORDER BY date_trunc('milliseconds',created_at) DESC,id DESC LIMIT $4",[user,after?.created_at??null,after?.id??null,q.limit+1]);
  const items=rows.slice(0,q.limit),last=items.at(-1);
  return {items:await Promise.all(items.map(r=>this.dto(db,r))),next_cursor:rows.length>q.limit?this.cursor.encode({id:last.id,created_at:last.created_at.toISOString()},scope):null};
 });}
}
