import {Cursor} from '../../common/http/cursor.js';
import type {PageInput} from '../accounts/accounts.input.js';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import type { AuthService } from '../auth/auth.service.js';
import { AccountTransaction } from '../accounts/account-transaction.js';
import { jobAccess, hasPermission, memberAccess } from '../jobs/jobs.access.js';
import { event } from '../chat/chat.store.js';
import { invoiceAmounts, RULE_VERSION } from './money.js';
import { held, lockAccounts, reserve } from './ledger.js';
import type { DraftInput, ActionInput, InvoiceAction } from './invoices.input.js';
import {readInvoice} from './invoice-view.js';
import {settleLockedInvoice} from './settlement.js';
export class InvoicesService {
 private readonly tx:AccountTransaction;
 constructor(private readonly pool:Pool,private readonly auth:AuthService,private readonly cursor:Cursor){this.tx=new AccountTransaction(pool,auth);}
 private async invoice(db:PoolClient,job:string){return (await db.query('SELECT * FROM invoices WHERE job_id=$1 FOR UPDATE',[job])).rows[0];}
 private read=readInvoice;
 private async access(db:PoolClient,id:string,user:string,byInvoice=false){
  const job=byInvoice?(await db.query('SELECT job_id FROM invoices WHERE id=$1',[id])).rows[0]?.job_id:id;
  if(!job)throw new NotFoundException();return jobAccess(db,job,user);
 }
 private async readTx<T>(header:string|undefined,work:(db:PoolClient,user:string)=>Promise<T>){
  const db=await this.pool.connect();try{await db.query('BEGIN');const actor=await this.auth.authenticate(header,db);const r=await work(db,actor.user.id);await db.query('COMMIT');return r;}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
 get(header:string|undefined,job:string){return this.readTx(header,async(db,user)=>{const a=await this.access(db,job,user);return this.read(db,job,a.customer);});}
 save(header:string|undefined,job:string,input:DraftInput,key:string){
  return this.tx.run(header,`invoice.draft.${job}`,key,input,async(db,actor)=>{
   const a=await this.access(db,job,actor.user.id);if(a.job.state!=='accepted')throw new ConflictException({code:'STATE_CONFLICT'});
   let i=await this.invoice(db,job);
   if((i?.version??1)!==input.expected_version)throw new ConflictException({code:'VERSION_CONFLICT'});
   if(i&&!['draft','revision_requested'].includes(i.state))throw new ConflictException({code:'STATE_CONFLICT'});
   for(const id of input.result_asset_ids){const asset=(await db.query("SELECT 1 FROM assets WHERE id=$1 AND uploader_id=$2 AND purpose='result' AND status='ready' FOR SHARE",[id,actor.user.id])).rows[0];if(!asset)throw new BadRequestException();}
   if(!i)i=(await db.query('INSERT INTO invoices(job_id) VALUES($1) RETURNING *',[job])).rows[0];
   const n=(await db.query('SELECT COALESCE(max(version_no),0)+1 AS n FROM invoice_versions WHERE invoice_id=$1',[i.id])).rows[0].n;
   const v=(await db.query('INSERT INTO invoice_versions(invoice_id,version_no,author_id,labor,materials,note,industry_details) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',[i.id,n,actor.user.id,input.labor,input.materials,input.note,JSON.stringify(input.industry_details)])).rows[0];
   for(const id of input.result_asset_ids)await db.query('INSERT INTO invoice_assets(version_id,asset_id) VALUES($1,$2)',[v.id,id]);
   await db.query("UPDATE invoices SET current_version_id=$2,state='draft',version=version+1 WHERE id=$1",[i.id,v.id]);
   return this.read(db,job);
  },async(db,actor)=>{const a=await this.access(db,job,actor.user.id);if(!a.assigned)throw new ForbiddenException();});
 }
 change(header:string|undefined,id:string,action:InvoiceAction,input:ActionInput,key:string){
  return this.tx.run(header,`invoice.${id}.${action}`,key,input,async(db,actor)=>{
   const a=await this.access(db,id,actor.user.id,true),job=a.job.id,i=await this.invoice(db,job);
   if(i.version!==input.expected_version || (input.version_id && input.version_id!==i.current_version_id) || (input.draft_version_id && input.draft_version_id!==i.current_version_id))throw new ConflictException({code:'VERSION_CONFLICT'});
   const v=(await db.query('SELECT * FROM invoice_versions WHERE id=$1',[i.current_version_id])).rows[0];
   if(action==='send'){
    this.state(i.state,['draft']);if(a.job.state!=='accepted')throw new ConflictException({code:'STATE_CONFLICT'});
    const assets=(await db.query('SELECT a.status FROM invoice_assets ia JOIN assets a ON a.id=ia.asset_id WHERE version_id=$1 FOR SHARE OF a',[v.id])).rows;
    if(!assets.length||assets.some(x=>x.status!=='ready'))throw new BadRequestException();
    await db.query('UPDATE invoice_versions SET sent_at=now() WHERE id=$1',[v.id]);await db.query("UPDATE invoices SET state='sent' WHERE id=$1",[id]);
   } else if(action==='revision-requests'){
    this.state(i.state,['sent']);if(a.job.state!=='accepted')throw new ConflictException({code:'STATE_CONFLICT'});await db.query('INSERT INTO invoice_revision_requests(invoice_id,version_id,customer_id,reason) VALUES($1,$2,$3,$4)',[id,v.id,actor.user.id,input.reason]);await db.query("UPDATE invoices SET state='revision_requested' WHERE id=$1",[id]);
   } else if(action==='confirm'){
    this.state(i.state,['sent']);if(a.job.state!=='accepted')throw new ConflictException({code:'STATE_CONFLICT'});let money;try{money=invoiceAmounts(v.labor,v.materials,input.points_used);}catch{throw new BadRequestException();}
    const accounts=await lockAccounts(db,a.job.customer_id,a.job.partner_id);await reserve(db,accounts,id,money.fee,input.points_used!);
    await db.query('INSERT INTO invoice_confirmations(invoice_id,version_id,customer_id,points_used,fee,reward,cash_due,rule_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,v.id,actor.user.id,input.points_used,money.fee,money.reward,money.cash_due,RULE_VERSION]);
    await db.query("UPDATE invoices SET state='locked',locked_version_id=$2 WHERE id=$1",[id,v.id]);await db.query("UPDATE jobs SET state='awaiting_settlement',version=version+1 WHERE id=$1",[job]);
   } else if(action==='payment-reported'){
    this.state(i.state,['locked','settled']);if(i.customer_payment_reported_at)throw new ConflictException({code:'STATE_CONFLICT'});
    await db.query('UPDATE invoices SET customer_payment_reported_at=now() WHERE id=$1',[id]);
   } else {
    const settlement=await settleLockedInvoice(db,a.job,i,{id:actor.user.id,kind:'worker'});
    return {invoice:await this.read(db,job),settlement_id:settlement,actor_kind:'worker' as const};
   }
   await db.query('UPDATE invoices SET version=version+1 WHERE id=$1',[id]);
   const result=await this.read(db,job);
   const type={send:'sent','revision-requests':'revision_requested',confirm:'locked','payment-reported':'payment_reported',settle:'settled'}[action];
   await event(db,`invoice:${id}:${result.version}`,id,result.version,`invoice.${type}.v1`,{invoice_id:id,version_id:result.version_id,resource_version:result.version});
   return result;
  },async(db,actor)=>{const a=await this.access(db,id,actor.user.id,true);if(['send','settle'].includes(action)?!a.assigned:!a.customer)throw new ForbiddenException();});
 }
 private state(current:string,allowed:string[]){if(!allowed.includes(current))throw new ConflictException({code:'STATE_CONFLICT'});}
 points(header:string|undefined){return this.readTx(header,async(db,user)=>{
  const a=(await db.query("SELECT * FROM ledger_accounts WHERE owner_user_id=$1 AND unit='POINT' FOR SHARE",[user])).rows[0];if(!a)return {balance:'0',held:'0',available:'0'};
  const h=await held(db,a.id);return {balance:a.balance,held:String(h),available:String(BigInt(a.balance)-h)};
 });}
 wallet(header:string|undefined,partner:string){return this.readTx(header,async(db,user)=>{
  await db.query('SELECT id FROM partners WHERE id=$1 FOR SHARE',[partner]);if(!hasPermission(await memberAccess(db,partner,user),'wallet.read'))throw new NotFoundException();
  const a=(await db.query("SELECT * FROM ledger_accounts WHERE owner_partner_id=$1 AND unit='VND' FOR SHARE",[partner])).rows[0];if(!a)throw new NotFoundException();
  const fee=await held(db,a.id,'invoice_fee'),withdraw=await held(db,a.id,'payout'),net=BigInt(a.balance)-fee-withdraw;
  return {partner_id:partner,balance:a.balance,fee_holds:String(fee),withdrawal_holds:String(withdraw),withdrawable:String(net>0n?net:0n),fee_credit_limit:'100000',shortfall:String(net+100000n<0n?-net-100000n:0n)};
 });}
 ledger(header:string|undefined,partner:string|undefined,q:PageInput){return this.readTx(header,async(db,user)=>{
  if(partner){await db.query('SELECT id FROM partners WHERE id=$1 FOR SHARE',[partner]);if(!hasPermission(await memberAccess(db,partner,user),'wallet.read'))throw new NotFoundException();}
  const account=(await db.query('SELECT id FROM ledger_accounts WHERE owner_partner_id=$1 OR ($1::uuid IS NULL AND owner_user_id=$2)',[partner??null,user])).rows[0];
  const scope=JSON.stringify(['ledger',user,partner??null]),start=this.cursor.decode(q.cursor,scope);if(!account)return {items:[],next_cursor:null};
  const {rows}=await db.query(`SELECT e.id,e.posting_code AS kind,e.delta::text AS amount,e.unit,date_trunc('milliseconds',e.created_at) AS created_at,s.invoice_id AS reference_id FROM ledger_entries e JOIN settlements s ON s.transaction_id=e.transaction_id WHERE e.account_id=$1 AND ($2::timestamptz IS NULL OR (date_trunc('milliseconds',e.created_at),e.id)<($2::timestamptz,$3::uuid)) ORDER BY date_trunc('milliseconds',e.created_at) DESC,e.id DESC LIMIT $4`,[account.id,start?.created_at??null,start?.id??null,q.limit+1]);
  const page=rows.slice(0,q.limit),last=page.at(-1);return {items:page.map(e=>({...e,created_at:e.created_at.toISOString()})),next_cursor:rows.length>q.limit?this.cursor.encode({id:last.id,created_at:last.created_at.toISOString()},scope):null};
 });}

}
