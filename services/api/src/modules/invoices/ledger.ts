import { UnprocessableEntityException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';
export async function lockAccounts(db:PoolClient,customer:string,partner:string) {
 await db.query("INSERT INTO ledger_accounts(owner_user_id,unit) VALUES($1,'POINT') ON CONFLICT(owner_user_id,unit) DO NOTHING",[customer]);
 for(const [code,unit] of [['fee_revenue','VND'],['point_redemption','VND'],['point_redemption_points','POINT'],['point_issuance','POINT']])
  await db.query('INSERT INTO ledger_accounts(system_code,unit) VALUES($1,$2) ON CONFLICT(system_code,unit) DO NOTHING',[code,unit]);
 const {rows}=await db.query(`SELECT * FROM ledger_accounts WHERE owner_user_id=$1 OR owner_partner_id=$2 OR system_code IN ('fee_revenue','point_redemption','point_redemption_points','point_issuance') ORDER BY id FOR UPDATE`,[customer,partner]);
 return {points:rows.find(x=>x.owner_user_id===customer)!,partner:rows.find(x=>x.owner_partner_id===partner)!,systems:Object.fromEntries(rows.filter(x=>x.system_code).map(x=>[x.system_code,x]))};
}
export async function held(db:PoolClient,id:string,kind?:string) {return BigInt((await db.query("SELECT COALESCE(sum(amount),0)::text AS amount FROM holds WHERE account_id=$1 AND state='active' AND ($2::text IS NULL OR kind=$2)",[id,kind??null])).rows[0].amount);}
export async function reserve(db:PoolClient,accounts:Awaited<ReturnType<typeof lockAccounts>>,invoice:string,fee:string,points:string) {
 if(BigInt(accounts.points.balance)-await held(db,accounts.points.id)<BigInt(points))throw new UnprocessableEntityException({code:'INSUFFICIENT_POINTS'});
 if(BigInt(accounts.partner.balance)+100000n-await held(db,accounts.partner.id)<BigInt(fee))throw new UnprocessableEntityException({code:'PARTNER_FUNDING_REQUIRED'});
 for(const [id,kind,amount] of [[accounts.points.id,'invoice_points',points],[accounts.partner.id,'invoice_fee',fee]])if(BigInt(amount)>0n)
  await db.query('INSERT INTO holds(account_id,kind,reference_id,amount) VALUES($1,$2,$3,$4)',[id,kind,invoice,amount]);
}
export async function postSettlement(db:PoolClient,accounts:Awaited<ReturnType<typeof lockAccounts>>,invoice:string,user:string,c:{fee:string;points_used:string;reward:string}) {
 const {rows:[tx]}=await db.query("INSERT INTO ledger_transactions(operation_key,kind,actor_id,correlation_id) VALUES($1,'invoice_settlement',$2,$3) RETURNING id",['invoice:'+invoice,user,randomUUID()]);
 const postings=[
  [accounts.partner,'invoice_net',BigInt(c.points_used)-BigInt(c.fee)],[accounts.systems.fee_revenue,'fee',BigInt(c.fee)],
  [accounts.systems.point_redemption,'point_redemption',-BigInt(c.points_used)],
  [accounts.points,'points_spent',-BigInt(c.points_used)],[accounts.systems.point_redemption_points,'points_spent',BigInt(c.points_used)],
  [accounts.points,'reward',BigInt(c.reward)],[accounts.systems.point_issuance,'reward',-BigInt(c.reward)],
 ] as const;
 for(const [account,code,delta] of postings)if(delta!==0n)await db.query('INSERT INTO ledger_entries(transaction_id,account_id,unit,delta,posting_code) VALUES($1,$2,$3,$4,$5)',[tx.id,account.id,account.unit,String(delta),code]);
 await db.query("UPDATE holds SET state='consumed',ended_at=now() WHERE reference_id=$1 AND state='active' AND kind IN ('invoice_fee','invoice_points')",[invoice]);
 const {rows:[s]}=await db.query("INSERT INTO settlements(invoice_id,transaction_id,actor_id,actor_kind) VALUES($1,$2,$3,'worker') RETURNING id",[invoice,tx.id,user]);return s.id as string;
}
