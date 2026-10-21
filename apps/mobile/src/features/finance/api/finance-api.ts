import {requestJson} from '../../../lib/http/request';
import {ApiError} from '../../../lib/http/api-error';
import type {AuthSession} from '../../auth/state/auth-session';
import {record} from '../../jobs/api/jobs-api';
import type {Bank,BankAccount,FinanceItem,FinancePage,FinanceDomain} from '../models';
const date=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const positive=(v:unknown)=>typeof v==='string'&&/^[1-9][0-9]*$/.test(v);
export function isBankAccount(v:unknown):v is BankAccount{return record(v)&&['id','bank_code','account_last4','holder_name','status'].every(k=>typeof v[k]==='string')&&/^[0-9]{4}$/.test(v.account_last4 as string)&&Number.isInteger(v.version)&&Number(v.version)>0;}
export function isBank(v:unknown):v is Bank{return record(v)&&typeof v.partner_id==='string'&&Number.isInteger(v.version)&&Number(v.version)>0&&(v.current===null||isBankAccount(v.current))&&(v.pending===null||isBankAccount(v.pending));}
export function isFinanceItem(v:unknown):v is FinanceItem{return record(v)&&typeof v.id==='string'&&typeof v.partner_id==='string'&&typeof v.state==='string'&&Number.isInteger(v.version)&&Number(v.version)>0&&date(v.created_at)&&Array.isArray(v.history)&&v.history.every(h=>record(h)&&typeof h.actor_id==='string'&&typeof h.action==='string'&&typeof h.reason==='string'&&date(h.created_at))&&(v.amount===undefined?typeof v.bank_code==='string'&&typeof v.account_last4==='string':positive(v.amount));}
export function isFinancePage(v:unknown):v is FinancePage{return record(v)&&Array.isArray(v.items)&&v.items.every(isFinanceItem)&&(v.next_cursor===null||typeof v.next_cursor==='string');}
export class FinanceApi {
 constructor(private manager:AuthSession,private owner:string,private base:string|undefined,private transport:typeof fetch=fetch){}
 request<T>(path:string,validate:(v:unknown)=>v is T,body?:unknown,key?:string,method:'POST'|'PUT'='POST'){
  if(!this.base||!/^https?:\/\//.test(this.base))return Promise.reject<T>(new ApiError('CONFIG'));
  return this.manager.featureOperation(this.owner,token=>requestJson(this.base!.replace(/\/$/,'')+path,this.transport,undefined,undefined,validate,{...(body===undefined?{method:'GET'}:{method,body}),headers:{Authorization:'Bearer '+token,...(key?{'Idempotency-Key':key}:{})}}) as Promise<T>,body===undefined);
 }
 bank(partner:string){return this.request('/partners/'+partner+'/bank',isBank);}
 history(partner:string,d:FinanceDomain,cursor?:string){return this.request('/partners/'+partner+'/finance-history/'+d+(cursor?'?cursor='+encodeURIComponent(cursor):''),isFinancePage);}
 detail(d:FinanceDomain,id:string){return this.request('/'+d+'/'+id,isFinanceItem);}
 reauth(password:string,scope:'bank'|'payout'){return this.request('/finance/reauthenticate',(v):v is {grant:string;expires_at:string}=>record(v)&&typeof v.grant==='string'&&date(v.expires_at),{password,scope});}
}
