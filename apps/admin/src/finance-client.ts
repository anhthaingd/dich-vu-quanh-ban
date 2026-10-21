import {ClientError,type AdminClient} from './client';
export type Domain='topups'|'payouts'|'bank-accounts';
export type FinanceItem={id:string;partner_id:string;version:number;state:string;amount?:string;bank_code?:string;account_last4?:string;holder_name?:string;bank_last4?:string|null;bank_reference?:string|null;bank_snapshot?:{bank_code:string;account_last4:string;holder_name:string}|null;evidence_id?:string|null;created_at:string;history:{actor_id:string;action:string;reason:string;version:number;bank_reference:string|null;created_at:string}[]};
export type FinancePage={items:FinanceItem[];next_cursor:string|null};
function object(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v);}
export function isFinanceItem(v:unknown):v is FinanceItem{return object(v)&&typeof v.id==='string'&&typeof v.partner_id==='string'&&Number.isInteger(v.version)&&Number(v.version)>0&&typeof v.state==='string'&&typeof v.created_at==='string'&&Array.isArray(v.history)&&v.history.every(h=>object(h)&&typeof h.reason==='string'&&typeof h.action==='string'&&typeof h.created_at==='string')&&(v.amount===undefined?typeof v.bank_code==='string'&&typeof v.account_last4==='string':typeof v.amount==='string'&&/^[1-9][0-9]*$/.test(v.amount));}
export class FinanceClient {
 constructor(readonly client:AdminClient){}
 async list(d:Domain,q:string,state:string,cursor?:string){const v=await this.client.call('/admin/'+d+'?'+new URLSearchParams({q,state,...(cursor?{cursor}:{})}));if(!object(v)||!Array.isArray(v.items)||!v.items.every(isFinanceItem)||!(v.next_cursor===null||typeof v.next_cursor==='string'))throw new ClientError('INVALID_RESPONSE');return v as FinancePage;}
 async detail(d:Domain,id:string){const v=await this.client.call('/admin/'+d+'/'+id);if(!isFinanceItem(v))throw new ClientError('INVALID_RESPONSE');return v;}
 async decision(d:Domain,id:string,input:unknown,key:string){const v=await this.client.call('/admin/'+d+'/'+id+'/decision','POST',input,key);if(!isFinanceItem(v))throw new ClientError('INVALID_RESPONSE');return v;}
 async deposit(input:unknown,key:string){const v=await this.client.call('/admin/finance-simulator/deposits','POST',input,key);if(!object(v)||v.state!=='recorded')throw new ClientError('INVALID_RESPONSE');return v;}
}
