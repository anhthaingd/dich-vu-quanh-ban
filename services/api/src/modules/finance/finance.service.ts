import {BadRequestException,ConflictException,ForbiddenException,NotFoundException,ServiceUnavailableException,HttpException,UnprocessableEntityException} from '@nestjs/common';
import {randomBytes,randomUUID} from 'node:crypto';
import type {Pool,PoolClient,QueryResultRow} from 'pg';
import type {AuthService} from '../auth/auth.service.js';
import type {AdminAuthService,Actor} from '../admin-auth/admin-auth.service.js';
import {AccountTransaction} from '../accounts/account-transaction.js';
import {Cursor} from '../../common/http/cursor.js';
import {MessageSecrets} from '../../integrations/local-messages.js';
import {verifyPassword} from '../auth/password.js';
import {hasPermission,memberAccess} from '../jobs/jobs.access.js';
import {held} from '../invoices/ledger.js';
import type {FinanceDomain,bankInput,moneyInput,cancelInput,decisionInput} from './finance.input.js';
import {queueInput} from '../moderation/moderation.input.js';
export type FinanceConfig={secret:string};
const tables={'bank-accounts':'bank_change_requests',topups:'finance_topups',payouts:'finance_payouts'} as const;
const pendingPayout="state IN ('pending','approved','transferring','unknown')";
export class FinanceService {
 private tx:AccountTransaction;private secrets:MessageSecrets;
 constructor(private pool:Pool,private auth:AuthService,private admin:AdminAuthService,private cursor:Cursor,private config?:FinanceConfig){this.tx=new AccountTransaction(pool,auth);this.secrets=new MessageSecrets(config?.secret??randomBytes(32).toString('hex'));}
 private configured(){if(!this.config)throw new ServiceUnavailableException();}
 private async access(db:PoolClient,partner:string,user:string,permission='wallet.read'){
  if(!(await db.query('SELECT id FROM partners WHERE id=$1 AND archived_at IS NULL FOR UPDATE',[partner])).rowCount)throw new NotFoundException();
  const m=await memberAccess(db,partner,user);if(!hasPermission(m,'wallet.read')||!hasPermission(m,permission))throw new NotFoundException();
 }
 private async account(db:PoolClient,partner:string){const r=(await db.query("SELECT * FROM ledger_accounts WHERE owner_partner_id=$1 AND unit='VND' FOR UPDATE",[partner])).rows[0];if(!r)throw new NotFoundException();return r;}
 private async noPayout(db:PoolClient,partner:string){if((await db.query(`SELECT 1 FROM finance_payouts WHERE partner_id=$1 AND ${pendingPayout}`,[partner])).rowCount)throw new ConflictException({code:'STATE_CONFLICT'});}
 private async read<T>(header:string|undefined,work:(db:PoolClient,a:Actor)=>Promise<T>){this.configured();const db=await this.pool.connect();try{await db.query('BEGIN');const a=await this.auth.authenticate(header,db);const r=await work(db,a);await db.query('COMMIT');return r;}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}}
 async reauthenticate(header:string|undefined,password:string,scope:'bank'|'payout'){
  this.configured();const result=await this.admin.transaction(header,async(db,a)=>{
   const attempts=(await db.query("SELECT count(*) FROM auth_rate_events WHERE actor_id=$1 AND purpose='reauth' AND created_at>clock_timestamp()-interval '15 minutes'",[a.user.id])).rows[0].count;
   if(Number(attempts)>=5)throw new HttpException({code:'RATE_LIMITED'},429);
   await db.query("INSERT INTO auth_rate_events(actor_id,contact_hash,ip_hash,purpose) VALUES($1,'finance','local','reauth')",[a.user.id]);
   const identity=(await db.query("SELECT password_hash FROM identities WHERE user_id=$1 AND provider='email'",[a.user.id])).rows[0];
   if(!await verifyPassword(password,identity?.password_hash??null))return null;
   const grant=randomBytes(32).toString('hex');const r=(await db.query(`INSERT INTO finance_reauth_grants(user_id,family_id,token_hash,scope,expires_at) SELECT $1,family_id,$2,$3,clock_timestamp()+interval '5 minutes' FROM sessions WHERE id=$4 RETURNING expires_at`,[a.user.id,this.secrets.hash(grant),scope,a.sessionId])).rows[0];
   return {grant,expires_at:r.expires_at.toISOString()};
  });if(!result)throw new ForbiddenException({code:'REAUTH_REQUIRED'});return result;
 }
 private async consume(db:PoolClient,a:Actor,grant:string,scope:string){const r=await db.query(`UPDATE finance_reauth_grants g SET consumed_at=clock_timestamp() FROM sessions s WHERE s.id=$1 AND g.user_id=$2 AND g.family_id=s.family_id AND g.token_hash=$3 AND g.scope=$4 AND g.expires_at>clock_timestamp() AND g.consumed_at IS NULL RETURNING g.id`,[a.sessionId,a.user.id,this.secrets.hash(grant),scope]);if(!r.rowCount)throw new ForbiddenException({code:'REAUTH_REQUIRED'});}
 private bankDto(r:QueryResultRow){return {id:r.id,bank_code:r.bank_code,account_last4:r.account_last4,holder_name:r.holder_name,status:r.current===undefined?r.state:'verified',version:r.version??1};}
 private async bank(db:PoolClient,partner:string){const current=(await db.query('SELECT * FROM verified_bank_accounts WHERE partner_id=$1 AND current',[partner])).rows[0],pending=(await db.query("SELECT * FROM bank_change_requests WHERE partner_id=$1 AND state='pending'",[partner])).rows[0];const latest=(await db.query('SELECT max(version) AS version FROM bank_change_requests WHERE partner_id=$1',[partner])).rows[0];return {partner_id:partner,version:latest?.version??1,current:current?this.bankDto(current):null,pending:pending?this.bankDto(pending):null};}
 getBank(header:string|undefined,partner:string){return this.read(header,async(db,a)=>{await this.access(db,partner,a.user.id);return this.bank(db,partner);});}
 setBank(header:string|undefined,partner:string,input:ReturnType<typeof bankInput>,key:string){this.configured();return this.tx.run(header,'finance.bank.'+partner,key,input,async(db,a)=>{
  const b=await this.bank(db,partner);if(b.version!==input.expected_version)throw new ConflictException({code:'VERSION_CONFLICT'});if(b.pending)throw new ConflictException({code:'STATE_CONFLICT'});await this.noPayout(db,partner);await this.consume(db,a,input.reauth_grant,'bank');const account=await this.account(db,partner);
  const r=(await db.query(`INSERT INTO bank_change_requests(partner_id,user_id,account_id,bank_code,account_cipher,account_last4,holder_name,reason,version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,version`,[partner,a.user.id,account.id,input.bank_code,this.secrets.encrypt(input.account_number),input.account_number.slice(-4),input.holder_name,input.reason,b.version+1])).rows[0];await this.history(db,'bank-accounts',r.id,a.user.id,'request',input.reason,r.version);return this.bank(db,partner);
 },async(db,a)=>{await this.access(db,partner,a.user.id,'bank.manage');});}
 cancelBank(header:string|undefined,partner:string,input:ReturnType<typeof cancelInput>,key:string){this.configured();return this.tx.run(header,'finance.bank.cancel.'+partner,key,input,async(db,a)=>{
  const b=await this.bank(db,partner);if(!b.pending)throw new ConflictException({code:'STATE_CONFLICT'});if(b.version!==input.expected_version)throw new ConflictException({code:'VERSION_CONFLICT'});await db.query("UPDATE bank_change_requests SET state='cancelled',version=version+1 WHERE id=$1",[b.pending.id]);await this.history(db,'bank-accounts',b.pending.id,a.user.id,'cancel',input.reason,b.version+1);return this.bank(db,partner);
 },async(db,a)=>{await this.access(db,partner,a.user.id,'bank.manage');});}
 private async evidence(db:PoolClient,ids:string[],user:string){for(const id of ids)if(!(await db.query("SELECT 1 FROM assets WHERE id=$1 AND uploader_id=$2 AND purpose='evidence' AND status='ready' FOR SHARE",[id,user])).rowCount)throw new NotFoundException();}
 create(header:string|undefined,d:'topups'|'payouts',input:ReturnType<typeof moneyInput>,key:string){this.configured();return this.tx.run(header,'finance.create.'+d,key,input,async(db,a)=>{
  const account=await this.account(db,input.partner_id);let id:string;
  if(d==='topups'){
   await this.evidence(db,input.evidence_id?[input.evidence_id]:[],a.user.id);
   id=(await db.query('INSERT INTO finance_topups(partner_id,user_id,account_id,amount,evidence_id) VALUES($1,$2,$3,$4,$5) RETURNING id',[input.partner_id,a.user.id,account.id,input.amount,input.evidence_id??null])).rows[0].id;
  }else{
   await this.consume(db,a,input.reauth_grant!,'payout');
   const bank=(await db.query('SELECT * FROM verified_bank_accounts WHERE partner_id=$1 AND id=$2 AND current FOR SHARE',[input.partner_id,input.bank_account_id])).rows[0];if(!bank)throw new ConflictException({code:'STATE_CONFLICT'});
   if(BigInt(account.balance)-await held(db,account.id)<BigInt(input.amount))throw new UnprocessableEntityException({code:'PARTNER_FUNDING_REQUIRED'});
   id=(await db.query('INSERT INTO finance_payouts(partner_id,user_id,account_id,amount,bank_account_id,bank_snapshot) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',[input.partner_id,a.user.id,account.id,input.amount,bank.id,JSON.stringify({bank_code:bank.bank_code,account_last4:bank.account_last4,holder_name:bank.holder_name})])).rows[0].id;
   await db.query("INSERT INTO holds(account_id,kind,reference_id,amount) VALUES($1,'payout',$2,$3)",[account.id,id,input.amount]);
  }await this.history(db,d,id,a.user.id,'request','Local test money request',1);return this.detail(db,d,id);
 },async(db,a)=>{await this.access(db,input.partner_id,a.user.id,d==='topups'?'wallet.topup':'wallet.withdraw');});}
 private async history(db:PoolClient,d:FinanceDomain,id:string,user:string,action:string,reason:string,version:number,reference?:string,evidence:string[]=[]){
  await db.query('INSERT INTO finance_history(domain,resource_id,actor_id,action,reason,version,bank_reference,evidence_ids) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[d,id,user,action,reason,version,reference??null,evidence]);
  await db.query('INSERT INTO audit_events(actor_id,action,resource_id,reason,details) VALUES($1,$2,$3,$4,$5)',[user,`finance.${d}.${action}`,id,reason,JSON.stringify({version})]);
 }
 private async row(db:PoolClient,d:FinanceDomain,id:string,lock=false){const r=(await db.query(`SELECT * FROM ${tables[d]} WHERE id=$1${lock?' FOR UPDATE':''}`,[id])).rows[0];if(!r)throw new NotFoundException();return r;}
 async detail(db:PoolClient,d:FinanceDomain,id:string){const r=await this.row(db,d,id);const history=(await db.query('SELECT actor_id,action,reason,version,bank_reference,created_at FROM finance_history WHERE domain=$1 AND resource_id=$2 ORDER BY version,created_at,id',[d,id])).rows.map(h=>({...h,created_at:h.created_at.toISOString()}));return {id:r.id,partner_id:r.partner_id,version:r.version,state:r.state,created_at:r.created_at.toISOString(),history,...(d==='bank-accounts'?{bank_code:r.bank_code,account_last4:r.account_last4,holder_name:r.holder_name,reason:r.reason}:{amount:r.amount,bank_last4:r.bank_snapshot?.account_last4??null,bank_snapshot:r.bank_snapshot??null,bank_reference:r.bank_reference,evidence_id:r.evidence_id??null})};}
 get(header:string|undefined,d:FinanceDomain,id:string){return this.read(header,async(db,a)=>{const r=await this.row(db,d,id);await this.access(db,r.partner_id,a.user.id);return this.detail(db,d,id);});}
 cancel(header:string|undefined,d:'topups'|'payouts',id:string,input:ReturnType<typeof cancelInput>,key:string){this.configured();return this.tx.run(header,`finance.cancel.${d}.${id}`,key,input,async(db,a)=>{const r=await this.row(db,d,id,true);this.guard(r,input.expected_version,['pending']);await this.account(db,r.partner_id);await db.query(`UPDATE ${tables[d]} SET state='cancelled',version=version+1 WHERE id=$1`,[id]);if(d==='payouts')await this.endHold(db,id,'released');await this.history(db,d,id,a.user.id,'cancel',input.reason,r.version+1);return this.detail(db,d,id);},async(db,a)=>{const r=await this.row(db,d,id);await this.access(db,r.partner_id,a.user.id,d==='topups'?'wallet.topup':'wallet.withdraw');});}
 private guard(r:{version:number;state:string},v:number,states:string[]){if(r.version!==v)throw new ConflictException({code:'VERSION_CONFLICT'});if(!states.includes(r.state))throw new ConflictException({code:'STATE_CONFLICT'});}
 async list(header:string|undefined,token:string|undefined,d:FinanceDomain,q:ReturnType<typeof queueInput>,partner?:string){this.configured();const work=async(db:PoolClient,a:Actor)=>{
  if(partner)await this.access(db,partner,a.user.id);const scope=JSON.stringify(['finance',a.user.id,d,partner,q.q,q.state]);const after=this.cursor.decode(q.cursor,scope);
  const {rows}=await db.query(`SELECT r.id,date_trunc('milliseconds',r.created_at) AS created_at FROM ${tables[d]} r JOIN partners p ON p.id=r.partner_id WHERE ($1::uuid IS NULL OR r.partner_id=$1) AND ($2='all' OR r.state=$2) AND ($3='' OR position(lower($3) in lower(r.id::text||' '||p.name))>0) AND ($4::timestamptz IS NULL OR (date_trunc('milliseconds',r.created_at),r.id)<($4::timestamptz,$5::uuid)) ORDER BY date_trunc('milliseconds',r.created_at) DESC,r.id DESC LIMIT $6`,[partner??null,q.state,q.q,after?.created_at??null,after?.id??null,q.limit+1]);
  const page=rows.slice(0,q.limit),last=page.at(-1);return {items:await Promise.all(page.map(r=>this.detail(db,d,r.id))),next_cursor:rows.length>q.limit?this.cursor.encode({id:last.id,created_at:last.created_at.toISOString()},scope):null};
 };return partner?this.read(header,work):this.admin.read(header,token,'finance.read',async(db,a)=>{const r=await work(db,a);await this.auditRead(db,a.user.id,d,a.user.id);return r;});}
 adminGet(header:string|undefined,token:string|undefined,d:FinanceDomain,id:string){this.configured();return this.admin.read(header,token,'finance.read',async(db,a)=>{const r=await this.detail(db,d,id);await this.auditRead(db,a.user.id,d,id);return r;});}
 private async auditRead(db:PoolClient,user:string,d:FinanceDomain,id:string){await db.query("INSERT INTO audit_events(actor_id,action,resource_id,reason,details) VALUES($1,$2,$3,'Finance read','{}')",[user,`finance.${d}.read`,id]);}
 private async endHold(db:PoolClient,id:string,state:'released'|'consumed'){if(!(await db.query("UPDATE holds SET state=$2,ended_at=now() WHERE reference_id=$1 AND kind='payout' AND state='active' RETURNING id",[id,state])).rowCount)throw new ConflictException({code:'STATE_CONFLICT'});}
 private async post(db:PoolClient,d:'topups'|'payouts',r:QueryResultRow,user:string){
  const system=d==='topups'?'local_bank_deposits':'local_bank_payouts';await db.query("INSERT INTO ledger_accounts(system_code,unit) VALUES($1,'VND') ON CONFLICT(system_code,unit) DO NOTHING",[system]);
  // Every posting locks account UUIDs in ascending order, just like invoice settlement.
  const accounts=(await db.query('SELECT * FROM ledger_accounts WHERE id=$1 OR system_code=$2 ORDER BY id FOR UPDATE',[r.account_id,system])).rows;
  const target=accounts.find(x=>x.id===r.account_id)!,source=accounts.find(x=>x.system_code===system)!;
  const tx=(await db.query('INSERT INTO ledger_transactions(operation_key,kind,actor_id,correlation_id) VALUES($1,$2,$3,$4) RETURNING id',[`finance:${d}:${r.id}`,d==='topups'?'topup':'payout',user,randomUUID()])).rows[0].id;
  const delta=BigInt(r.amount)*(d==='topups'?1n:-1n);
  for(const [a,n]of [[target,delta],[source,-delta]] as const)await db.query("INSERT INTO ledger_entries(transaction_id,account_id,unit,delta,posting_code) VALUES($1,$2,'VND',$3,$4)",[tx,a.id,String(n),d]);
  return tx;
 }
 decision(header:string|undefined,token:string|undefined,d:FinanceDomain,id:string,input:ReturnType<typeof decisionInput>,key:string){this.configured();return this.tx.run(header,`finance.decision.${d}.${id}`,key,input,async(db,a)=>{
  const r=await this.row(db,d,id,true);if(r.version!==input.expected_version)throw new ConflictException({code:'VERSION_CONFLICT'});
  await this.evidence(db,input.evidence_ids,a.user.id);let state:string,reference:string|undefined,transaction:string|undefined;
  if(d==='bank-accounts'){
   this.guard(r,input.expected_version,['pending']);if(!['approve','reject'].includes(input.decision))throw new BadRequestException();
   if(input.decision==='approve'){if(!input.checked)throw new BadRequestException();await this.noPayout(db,r.partner_id);await db.query('UPDATE verified_bank_accounts SET current=false WHERE partner_id=$1 AND current',[r.partner_id]);await db.query('INSERT INTO verified_bank_accounts(partner_id,request_id,bank_code,account_cipher,account_last4,holder_name) VALUES($1,$2,$3,$4,$5,$6)',[r.partner_id,r.id,r.bank_code,r.account_cipher,r.account_last4,r.holder_name]);}state=input.decision==='approve'?'approved':'rejected';
  }else if(d==='topups'){
   this.guard(r,input.expected_version,['pending']);if(!['approve','reject'].includes(input.decision))throw new BadRequestException();
   if(input.decision==='approve'){
    const candidate=input.bank_reference;if(!input.checked||!candidate)throw new BadRequestException();
    await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",['finance-topup:'+candidate]);
    const deposit=(await db.query('SELECT * FROM local_bank_deposits WHERE reference=$1 FOR SHARE',[candidate])).rows[0];if(!deposit||deposit.partner_id!==r.partner_id||deposit.amount!==r.amount)throw new ConflictException({code:'STATE_CONFLICT'});
    if((await db.query('SELECT 1 FROM finance_topups WHERE bank_reference=$1',[candidate])).rowCount)throw new ConflictException({code:'STATE_CONFLICT'});
    reference=candidate;transaction=await this.post(db,d,r,a.user.id);
   }state=input.decision==='approve'?'confirmed':'rejected';
  }else{
   if(input.decision==='reject'){this.guard(r,input.expected_version,['pending','approved']);await this.account(db,r.partner_id);await this.endHold(db,id,'released');state='rejected';}
   else if(input.decision==='approve'){this.guard(r,input.expected_version,['pending']);if(!input.checked)throw new BadRequestException();state='approved';}
   else if(input.decision==='transferring'){
    this.guard(r,input.expected_version,['approved']);if(!input.checked)throw new BadRequestException();
    // Durable local simulator is the provider: one transfer per original payout ID.
    reference='LOCAL-PAYOUT-'+id;const outcome=input.simulator_scenario.includes('failure')?'failed':'succeeded',lost=input.simulator_scenario.startsWith('timeout_');
    await db.query('INSERT INTO local_bank_transfers(payout_id,reference,amount,bank_account_id,outcome,response_lost) VALUES($1,$2,$3,$4,$5,$6)',[id,reference,r.amount,r.bank_account_id,outcome,lost]);state=lost?'unknown':'transferring';
   }else if(['succeeded','failed_verified'].includes(input.decision)){
    this.guard(r,input.expected_version,['transferring','unknown']);if(!input.checked)throw new BadRequestException();
    const transfer=(await db.query('SELECT * FROM local_bank_transfers WHERE payout_id=$1 FOR SHARE',[id])).rows[0];if(!transfer||transfer.amount!==r.amount||transfer.bank_account_id!==r.bank_account_id||input.bank_reference&&input.bank_reference!==transfer.reference||transfer.outcome!==(input.decision==='succeeded'?'succeeded':'failed'))throw new ConflictException({code:'STATE_CONFLICT'});
    reference=transfer.reference;await this.account(db,r.partner_id);if(input.decision==='succeeded'){transaction=await this.post(db,d,r,a.user.id);await this.endHold(db,id,'consumed');state='succeeded';}else{await this.endHold(db,id,'released');state='failed';}
   }else throw new BadRequestException();
  }
  await db.query(`UPDATE ${tables[d]} SET state=$2,version=version+1${d==='bank-accounts'?'':',bank_reference=COALESCE($3,bank_reference),transaction_id=COALESCE($4,transaction_id)'} WHERE id=$1`,d==='bank-accounts'?[id,state]:[id,state,reference??null,transaction??null]);
  await this.history(db,d,id,a.user.id,input.decision,input.reason,r.version+1,reference,input.evidence_ids);return this.detail(db,d,id);
 },async(db,a)=>{await this.admin.check(db,a,token,'finance.review',true);const r=await this.row(db,d,id);await db.query('SELECT id FROM partners WHERE id=$1 FOR UPDATE',[r.partner_id]);});}
 // Only a fresh finance reviewer can create test deposits; a request or image never credits money.
 deposit(header:string|undefined,token:string|undefined,input:{reference:string;partner_id:string;amount:string},key:string){this.configured();return this.tx.run(header,'finance.simulator.deposit',key,input,async(db,a)=>{await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['finance-deposit:'+input.reference]);if((await db.query('SELECT 1 FROM local_bank_deposits WHERE reference=$1',[input.reference])).rowCount)throw new ConflictException({code:'STATE_CONFLICT'});await db.query('INSERT INTO local_bank_deposits(reference,partner_id,amount,created_by) VALUES($1,$2,$3,$4)',[input.reference,input.partner_id,input.amount,a.user.id]);return {...input,state:'recorded',environment:'local-test'};},async(db,a)=>{await this.admin.check(db,a,token,'finance.review',true);});}
}
