import {BadRequestException,ConflictException,ForbiddenException,NotFoundException} from '@nestjs/common';
import {createHash} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {AuthService} from '../auth/auth.service.js';
import {AdminAuthService} from '../admin-auth/admin-auth.service.js';
import {Cursor} from '../../common/http/cursor.js';
import {queueInput} from '../moderation/moderation.input.js';
import {readInvoice} from '../invoices/invoice-view.js';
import {auditInput,grantsInput,type ReadDomain} from './backoffice.input.js';
export class BackofficeService {
 constructor(private pool:Pool,private auth:AuthService,private admin:AdminAuthService,private cursor:Cursor){}
 private async audit(db:PoolClient,actor:string,action:string,id:string,details:unknown,reason='Administration read'){await db.query('INSERT INTO audit_events(actor_id,action,resource_id,reason,details) VALUES($1,$2,$3,$4,$5)',[actor,action,id,reason,JSON.stringify(details)]);}
 auditLog(header:string|undefined,token:string|undefined,q:ReturnType<typeof auditInput>){return this.admin.read(header,token,'audit.read',async(db,a)=>{
  const scope=`global-audit:${a.user.id}:${q.resource_id??'*'}`,after=this.cursor.decode(q.cursor,scope);
  // Project only the public audit contract; details contain private payloads and never leave this query.
  // Existing events encode their domain in the action namespace.
  const rows=(await db.query(`SELECT id,actor_id,action,resource_id,reason,date_trunc('milliseconds',created_at) AS created_at,
   CASE WHEN split_part(action,'.',1) IN ('admin','finance') THEN split_part(action,'.',2) ELSE split_part(action,'.',1) END AS resource_type
   FROM audit_events WHERE ($1::uuid IS NULL OR resource_id=$1) AND ($2::timestamptz IS NULL OR (date_trunc('milliseconds',created_at),id)<($2::timestamptz,$3::uuid))
   ORDER BY date_trunc('milliseconds',created_at) DESC,id DESC LIMIT $4`,[q.resource_id??null,after?.created_at??null,after?.id??null,q.limit+1])).rows;
  const items=rows.slice(0,q.limit),last=items.at(-1);
  return {items,next_cursor:rows.length>q.limit?this.cursor.encode({id:last.id,created_at:last.created_at.toISOString()},scope):null};
 });}
 private async grantDetail(db:PoolClient,id:string){const r=(await db.query('SELECT id,display_name AS name,status,version FROM users WHERE id=$1',[id])).rows[0];if(!r)throw new NotFoundException();return {...r,permissions:(await db.query('SELECT permission FROM admin_grants WHERE user_id=$1 AND revoked_at IS NULL ORDER BY permission',[id])).rows.map(r=>r.permission)};}
 grants(header:string|undefined,token:string|undefined,id:string){return this.admin.read(header,token,'grant.manage',async(db,a)=>{const r=await this.grantDetail(db,id);await this.audit(db,a.user.id,'admin.grants.read',id,{});return r;});}
 async saveGrants(header:string|undefined,token:string|undefined,id:string,input:ReturnType<typeof grantsInput>,key:string){
  const initial=await this.auth.authenticate(header);if(initial.user.id===id)throw new ForbiddenException();
  const db=await this.pool.connect(),hash=createHash('sha256').update(JSON.stringify(input)).digest('hex'),operation='admin.grants:'+id;
  try{
   await db.query('BEGIN');
   // Serialize the grant authority graph BEFORE locking either user: A->B and B->A cannot deadlock.
   await db.query('SELECT pg_advisory_xact_lock(2110202602)');
   await db.query('SELECT id FROM users WHERE id=ANY($1::uuid[]) ORDER BY id FOR NO KEY UPDATE',[[initial.user.id,id]]);
   const a=await this.auth.authenticate(header,db);await this.admin.check(db,a,token,'grant.manage',true);
   const own=new Set((await db.query('SELECT permission FROM admin_grants WHERE user_id=$1 AND revoked_at IS NULL',[a.user.id])).rows.map(r=>r.permission));
   if(input.permissions.some(p=>!own.has(p)))throw new ForbiddenException();
   const prior=(await db.query('SELECT request_hash,response_snapshot FROM idempotency_keys WHERE actor_id=$1 AND operation=$2 AND request_key=$3',[a.user.id,operation,key])).rows[0];
   if(prior&&prior.request_hash!==hash)throw new ConflictException({code:'IDEMPOTENCY_MISMATCH'});
   if(prior){await db.query('COMMIT');return prior.response_snapshot;}
   const target=await this.grantDetail(db,id),before=target.permissions as string[];
   if(target.status!=='active')throw new ConflictException({code:'STATE_CONFLICT'});
   const changed=[...new Set([...before,...input.permissions])].filter(p=>before.includes(p)!==input.permissions.includes(p));
   if(changed.some(p=>!own.has(p)))throw new ForbiddenException();
   if(target.version!==input.expected_version)throw new ConflictException({code:'VERSION_CONFLICT'});
   if(before.includes('grant.manage')&&!input.permissions.includes('grant.manage')&&Number((await db.query("SELECT count(*) FROM admin_grants g JOIN users u ON u.id=g.user_id WHERE permission='grant.manage' AND revoked_at IS NULL AND u.status='active'")).rows[0].count)<=1)throw new ConflictException({code:'LAST_GRANT_MANAGER'});
   await db.query('UPDATE admin_grants SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL AND NOT(permission=ANY($2::text[]))',[id,input.permissions]);
   for(const p of input.permissions)if(!before.includes(p))await db.query('INSERT INTO admin_grants(user_id,permission) VALUES($1,$2)',[id,p]);
   await db.query('UPDATE users SET version=version+1 WHERE id=$1',[id]);
   await db.query('UPDATE admin_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE user_id=$1',[id]);
   await this.audit(db,a.user.id,'admin.grants.change',id,{before,after:input.permissions},input.reason);
   const result=await this.grantDetail(db,id);
   await db.query("INSERT INTO idempotency_keys(actor_id,operation,request_key,request_hash,state,resource_id,response_snapshot) VALUES($1,$2,$3,$4,'completed',$5,$6)",[a.user.id,operation,key,hash,id,JSON.stringify(result)]);
   await db.query('COMMIT');return result;
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();await this.auth.accessChanged();}
 }
 metrics(header:string|undefined,token:string|undefined,period:{from:string;to:string}){return this.admin.read(header,token,'reports.read',async(db,a)=>{
  // All values are exact decimal strings; a customer's payment mark alone is never revenue.
  const {rows}=await db.query(`SELECT 'jobs_requested' AS name,count(*)::text AS value,'count' AS unit FROM jobs WHERE created_at>=$1 AND created_at<$2
   UNION ALL SELECT 'jobs_open',count(*)::text,'count' FROM jobs WHERE created_at>=$1 AND created_at<$2 AND state IN ('requested','accepted','awaiting_settlement')
   UNION ALL SELECT 'two_marks_complete',count(*)::text,'count' FROM invoices WHERE GREATEST(customer_payment_reported_at,worker_receipt_confirmed_at)>=$1 AND GREATEST(customer_payment_reported_at,worker_receipt_confirmed_at)<$2 AND state='settled' AND customer_payment_reported_at IS NOT NULL AND worker_receipt_confirmed_at IS NOT NULL
   UNION ALL SELECT 'fee_settled',COALESCE(sum(e.delta),0)::text,'VND' FROM ledger_entries e JOIN ledger_accounts a ON a.id=e.account_id WHERE e.created_at>=$1 AND e.created_at<$2 AND a.system_code='fee_revenue'
   UNION ALL SELECT 'point_compensation',(-COALESCE(sum(e.delta),0))::text,'VND' FROM ledger_entries e JOIN ledger_accounts a ON a.id=e.account_id WHERE e.created_at>=$1 AND e.created_at<$2 AND a.system_code='point_redemption'
   UNION ALL SELECT 'reports_open',count(*)::text,'count' FROM reports WHERE created_at>=$1 AND created_at<$2 AND state NOT IN ('resolved','closed')
   UNION ALL SELECT 'topups_pending',count(*)::text,'count' FROM finance_topups WHERE created_at>=$1 AND created_at<$2 AND state='pending'
   UNION ALL SELECT 'payouts_pending',count(*)::text,'count' FROM finance_payouts WHERE created_at>=$1 AND created_at<$2 AND state IN ('pending','approved','transferring','unknown')`,[period.from,period.to]);
  await this.audit(db,a.user.id,'admin.metrics.read',a.user.id,{});const definitions:Record<string,string>={jobs_requested:'Requests created in period',jobs_open:'Requests created in period still open at read time',two_marks_complete:'Settled invoices whose second payment mark falls in period',fee_settled:'Posted fee revenue entries in period',point_compensation:'Posted VND point redemption compensation in period',reports_open:'Reports created in period still open at read time',topups_pending:'Topups created in period still pending at read time',payouts_pending:'Payouts created in period not yet terminal at read time'};return {items:rows.map(r=>({...r,definition:definitions[r.name]})),next_cursor:null,...period,as_of:new Date().toISOString(),scope:'local_test'};
 });}
 private permission(d:ReadDomain){return d==='grant-users'?'grant.manage':d==='invoices'?'finance.read':'reports.read';}
 private async detail(db:PoolClient,d:ReadDomain,id:string){
  if(d==='grant-users')return this.grantDetail(db,id);
  if(d==='invoices'){const i=(await db.query('SELECT job_id FROM invoices WHERE id=$1',[id])).rows[0];if(!i)throw new NotFoundException();return readInvoice(db,i.job_id);}
  const j=(await db.query('SELECT id,version,state,customer_id,partner_id,service_mode,time_mode,scheduled_at,accepted_at,completed_at,created_at FROM jobs WHERE id=$1',[id])).rows[0];if(!j)throw new NotFoundException();return j;
 }
 list(header:string|undefined,token:string|undefined,d:ReadDomain,q:ReturnType<typeof queueInput>){return this.admin.read(header,token,this.permission(d),async(db,a)=>{
  const table=d==='grant-users'?'users':d,state=d==='grant-users'?'status':'state';
  const allowed=d==='grant-users'?['active','suspended','deletion_requested','anonymized']:d==='jobs'?['requested','accepted','awaiting_settlement','completed','declined','withdrawn','stopped']:['draft','sent','revision_requested','locked','settled'];
  if(q.state!=='all'&&!allowed.includes(q.state))throw new BadRequestException();
  const scope=`backoffice:${d}:${a.user.id}:${JSON.stringify([q.q,q.state])}`,after=this.cursor.decode(q.cursor,scope);
  const {rows}=await db.query(`SELECT id,date_trunc('milliseconds',created_at) AS created_at FROM ${table} WHERE ($1='' OR position(lower($1) in lower(id::text${d==='grant-users'?"||' '||display_name":d==='invoices'?"||' '||job_id::text":"||' '||partner_id::text"}))>0) AND ($2='all' OR ${state}=$2) AND ($3::timestamptz IS NULL OR (date_trunc('milliseconds',created_at),id)<($3::timestamptz,$4::uuid)) ORDER BY date_trunc('milliseconds',created_at) DESC,id DESC LIMIT $5`,[q.q,q.state,after?.created_at??null,after?.id??null,q.limit+1]);
  const page=rows.slice(0,q.limit),last=page.at(-1);const items=[];for(const r of page)items.push(await this.detail(db,d,r.id));
  await this.audit(db,a.user.id,`admin.${d}.read`,a.user.id,{resource_ids:page.map(r=>r.id)});
  return {items,next_cursor:rows.length>q.limit?this.cursor.encode({id:last.id,created_at:last.created_at.toISOString()},scope):null};
 });}
 get(header:string|undefined,token:string|undefined,d:ReadDomain,id:string){return this.admin.read(header,token,this.permission(d),async(db,a)=>{const result=await this.detail(db,d,id);await this.audit(db,a.user.id,`admin.${d}.read`,id,{});return result;});}
 async operation(header:string|undefined,key:string,operation?:string){const a=await this.auth.authenticate(header);const {rows}=await this.pool.query('SELECT operation,state,resource_id,created_at FROM idempotency_keys WHERE actor_id=$1 AND request_key=$2 AND ($3::text IS NULL OR operation=$3) ORDER BY operation LIMIT 2',[a.user.id,key,operation??null]);if(!rows.length)throw new NotFoundException();if(rows.length>1)throw new ConflictException({code:'OPERATION_AMBIGUOUS'});return {key,...rows[0]};}
}
