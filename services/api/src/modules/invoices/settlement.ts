import {ConflictException} from '@nestjs/common';
import type {PoolClient} from 'pg';
import {lockAccounts,postSettlement} from './ledger.js';
import {event} from '../chat/chat.store.js';
export type LockedInvoice={id:string;version:number;state:string;locked_version_id:string;current_version_id:string};
export type SettlementJob={id:string;customer_id:string;partner_id:string;state:string};
// Caller holds partner -> job -> invoice. Both entrypoints use the same posting and event transaction.
export async function settleLockedInvoice(db:PoolClient,job:SettlementJob,i:LockedInvoice,actor:{id:string;kind:'worker'|'admin';report?:string;reason?:string}){
 if(i.state!=='locked'||job.state!=='awaiting_settlement')throw new ConflictException({code:'STATE_CONFLICT'});
 const c=(await db.query('SELECT * FROM invoice_confirmations WHERE invoice_id=$1',[i.id])).rows[0];
 if(!c||c.version_id!==i.locked_version_id||i.current_version_id!==i.locked_version_id)throw new ConflictException({code:'STATE_CONFLICT'});
 const accounts=await lockAccounts(db,job.customer_id,job.partner_id);
 for(const [kind,amount,account] of [['invoice_fee',c.fee,accounts.partner.id],['invoice_points',c.points_used,accounts.points.id]])if(BigInt(amount)>0n){
  const h=(await db.query("SELECT amount,account_id FROM holds WHERE reference_id=$1 AND kind=$2 AND state='active' FOR UPDATE",[i.id,kind])).rows[0];
  if(!h||h.amount!==amount||h.account_id!==account)throw new ConflictException({code:'STATE_CONFLICT'});
 }
 const settlement=await postSettlement(db,accounts,i.id,actor.id,c,actor);
 await db.query(`UPDATE invoices SET state='settled',settled_by_kind=$2,version=version+1,
  worker_receipt_confirmed_at=CASE WHEN $2='worker' THEN now() ELSE worker_receipt_confirmed_at END,
  worker_receipt_by=CASE WHEN $2='worker' THEN $3::uuid ELSE worker_receipt_by END WHERE id=$1`,[i.id,actor.kind,actor.id]);
 await db.query("UPDATE jobs SET state='completed',completed_at=now(),version=version+1 WHERE id=$1",[job.id]);
 await event(db,`invoice:${i.id}:${i.version+1}`,i.id,i.version+1,'invoice.settled.v1',{invoice_id:i.id,version_id:i.locked_version_id,resource_version:i.version+1});
 return settlement;
}
