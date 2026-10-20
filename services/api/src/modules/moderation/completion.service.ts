import {BadRequestException,ConflictException,NotFoundException} from '@nestjs/common';
import {createHash} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {AuthService} from '../auth/auth.service.js';
import {AdminAuthService,type Actor} from '../admin-auth/admin-auth.service.js';
import {AccountTransaction} from '../accounts/account-transaction.js';
import {readInvoice} from '../invoices/invoice-view.js';
import {settleLockedInvoice} from '../invoices/settlement.js';
import {recordDecision} from './history.js';
import type {completionInput} from './completion.input.js';
export class CompletionService {
 private readonly tx:AccountTransaction;
 constructor(pool:Pool,auth:AuthService,private readonly admin:AdminAuthService,private readonly previewTtlMs=300000){this.tx=new AccountTransaction(pool,auth);}
 private async authorize(db:PoolClient,a:Actor,token:string|undefined){await this.admin.grants(db,a,'support.read');return this.admin.check(db,a,token,'finance.review',true);}
 private async context(db:PoolClient,id:string){
  const ref=(await db.query('SELECT j.id,j.partner_id FROM reports r JOIN invoices i ON i.id=r.invoice_id JOIN jobs j ON j.id=i.job_id WHERE r.id=$1',[id])).rows[0];
  if(!ref)throw new NotFoundException();
  // Same resource order as worker settlement, report creation and job transitions.
  const partner=(await db.query('SELECT moderation_status FROM partners WHERE id=$1 FOR UPDATE',[ref.partner_id])).rows[0];
  const job=(await db.query('SELECT * FROM jobs WHERE id=$1 FOR UPDATE',[ref.id])).rows[0];
  const i=(await db.query('SELECT * FROM invoices WHERE job_id=$1 FOR UPDATE',[job.id])).rows[0];
  const report=(await db.query('SELECT * FROM reports WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(report.state==='closed'||report.job_id!==job.id||report.invoice_id!==i.id||report.invoice_version_id!==i.locked_version_id||i.state!=='locked'||i.current_version_id!==i.locked_version_id||job.state!=='awaiting_settlement')throw new ConflictException({code:'STATE_CONFLICT'});
  const c=(await db.query('SELECT c.*,v.labor,v.materials FROM invoice_confirmations c JOIN invoice_versions v ON v.id=c.version_id WHERE c.invoice_id=$1',[i.id])).rows[0];
  if(!c||c.version_id!==i.locked_version_id||partner.moderation_status==='suspended'||!(await db.query("SELECT 1 FROM users WHERE id=$1 AND status='active'",[job.customer_id])).rowCount||!(await db.query("SELECT 1 FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.partner_id=$1 AND m.is_owner AND m.active AND u.status='active'",[job.partner_id])).rowCount)throw new ConflictException({code:'STATE_CONFLICT'});
  const evidence=(await db.query("SELECT a.id FROM report_evidence e JOIN assets a ON a.id=e.asset_id WHERE e.report_id=$1 AND a.status='ready' AND a.purpose='evidence' ORDER BY a.id FOR SHARE OF a",[id])).rows.map(r=>r.id as string);
  if(!evidence.length)throw new ConflictException({code:'STATE_CONFLICT'});
  const money={fee:c.fee,points_used:c.points_used,reward:c.reward,partner_delta:String(BigInt(c.points_used)-BigInt(c.fee)),total:String(BigInt(c.labor)+BigInt(c.materials)),cash_due:c.cash_due};
  return {report,job,i,evidence,money};
 }
 private fingerprint(c:Awaited<ReturnType<CompletionService['context']>>,a:Actor){return createHash('sha256').update(JSON.stringify({purpose:'admin-completion-v1',actor:a.user.id,report:c.report.id,report_version:c.report.version,invoice:c.i.id,invoice_version:c.i.version,version:c.i.locked_version_id,evidence:c.evidence,money:c.money})).digest('hex');}
 preview(header:string|undefined,token:string|undefined,id:string){return this.admin.transaction(header,async(db,a)=>{
  await this.authorize(db,a,token);const c=await this.context(db,id),expires_at=new Date(Date.now()+this.previewTtlMs).toISOString();
  const preview_token=this.admin.secrets.encrypt(JSON.stringify({scope:this.fingerprint(c,a),expires_at}));
  await db.query("INSERT INTO audit_events(actor_id,action,resource_id,reason,details) VALUES($1,'admin.reports.completion-preview',$2,'Completion preview',$3)",[a.user.id,id,JSON.stringify({invoice_id:c.i.id,invoice_version_id:c.i.locked_version_id,report_version:c.report.version})]);
  return {invoice_id:c.i.id,invoice_version_id:c.i.locked_version_id,invoice_expected_version:c.i.version,...c.money,preview_token,expires_at};
 });}
 complete(header:string|undefined,token:string|undefined,id:string,input:ReturnType<typeof completionInput>,key:string){return this.tx.run(header,`admin.reports.complete:${id}`,key,input,async(db,a)=>{
  const c=await this.context(db,id);await this.authorize(db,a,token);
  if(input.expected_version!==c.report.version||input.invoice_id!==c.i.id||input.invoice_version_id!==c.i.locked_version_id||input.invoice_expected_version!==c.i.version)throw new ConflictException({code:'VERSION_CONFLICT'});
  let preview;try{preview=JSON.parse(this.admin.secrets.decrypt(input.preview_token));}catch{throw new BadRequestException();}
  if(!preview||preview.scope!==this.fingerprint(c,a)||!Number.isFinite(Date.parse(preview.expires_at))||Date.parse(preview.expires_at)<=Date.now())throw new ConflictException({code:'STATE_CONFLICT'});
  if(input.evidence_ids.some(asset=>!c.evidence.includes(asset)))throw new BadRequestException();
  const settlement=await settleLockedInvoice(db,c.job,c.i,{id:a.user.id,kind:'admin',report:id,reason:input.reason});
  for(const asset of input.evidence_ids)await db.query('INSERT INTO admin_completion_evidence(settlement_id,asset_id) VALUES($1,$2)',[settlement,asset]);
  await db.query('UPDATE reports SET version=version+1 WHERE id=$1',[id]);
  await recordDecision(db,'reports',id,a.user.id,'complete_on_behalf',input.reason,c.report.version+1);
  await db.query("INSERT INTO audit_events(actor_id,action,resource_id,reason,details) VALUES($1,'admin.completion.settled',$2,$3,$4)",[a.user.id,id,input.reason,JSON.stringify({settlement_id:settlement,invoice_id:c.i.id,invoice_version_id:c.i.locked_version_id,evidence_ids:input.evidence_ids,checked:true})]);
  return {invoice:await readInvoice(db,c.job.id),settlement_id:settlement,actor_kind:'admin' as const};
 },async(db,a)=>{await this.authorize(db,a,token);});}
}
