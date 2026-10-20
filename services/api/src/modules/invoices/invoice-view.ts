import {NotFoundException} from '@nestjs/common';
import type {PoolClient} from 'pg';
import {invoiceAmounts} from './money.js';
const iso=(v:Date|null)=>v?.toISOString()??null;
export async function readInvoice(db:PoolClient,job:string,customer=false){
  const i=(await db.query('SELECT * FROM invoices WHERE job_id=$1 FOR UPDATE',[job])).rows[0];if(!i)throw new NotFoundException();
  const revising=customer&&i.state==='draft';
  const v=revising?(await db.query('SELECT * FROM invoice_versions WHERE invoice_id=$1 AND sent_at IS NOT NULL ORDER BY version_no DESC LIMIT 1',[i.id])).rows[0]:(await db.query('SELECT * FROM invoice_versions WHERE id=$1',[i.current_version_id])).rows[0];
  if(!v)throw new NotFoundException();
  const c=(await db.query('SELECT * FROM invoice_confirmations WHERE invoice_id=$1',[i.id])).rows[0];
  const assets=(await db.query('SELECT asset_id FROM invoice_assets WHERE version_id=$1 ORDER BY created_at,id',[v.id])).rows.map(x=>x.asset_id);
  const money=invoiceAmounts(v.labor,v.materials,c?.points_used??'0');
  return {id:i.id,job_id:job,version:i.version,version_id:v.id,state:revising?'revision_requested':i.state,labor:v.labor,materials:v.materials,total:money.total,points_used:c?.points_used??'0',cash_due:c?.cash_due??money.cash_due,reward:c?.reward??money.reward,customer_payment_reported_at:iso(i.customer_payment_reported_at),worker_receipt_confirmed_at:iso(i.worker_receipt_confirmed_at),settled:i.state==='settled',review_eligible:!!(i.state==='settled'&&i.customer_payment_reported_at&&i.worker_receipt_confirmed_at),result_asset_ids:assets,note:v.note,revision_reason:(await db.query('SELECT reason FROM invoice_revision_requests WHERE invoice_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1',[i.id])).rows[0]?.reason??null};
 }
