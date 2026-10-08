import {requestJson} from '../../../lib/http/request';
import {ApiError} from '../../../lib/http/api-error';
import {record} from '../../jobs/api/jobs-api';
import type {LedgerPage,Invoice,InvoiceDraft,InvoiceAction,InvoiceChange,PointWallet,Wallet,Asset} from '../models';
const amount=(v:unknown)=>typeof v==='string'&&/^(0|[1-9][0-9]*)$/.test(v);
const signed=(v:unknown)=>typeof v==='string'&&/^-?(0|[1-9][0-9]*)$/.test(v);
const date=(v:unknown)=>v===null||typeof v==='string'&&Number.isFinite(Date.parse(v));
export function isInvoice(v:unknown):v is Invoice {return record(v)&&typeof v.note==='string'&&(v.revision_reason===null||typeof v.revision_reason==='string')&&['id','job_id','version_id'].every(k=>typeof v[k]==='string')&&Number.isSafeInteger(v.version)&&Number(v.version)>0&&['draft','sent','revision_requested','locked','settled'].includes(String(v.state))&&['labor','materials','total','points_used','cash_due','reward'].every(k=>amount(v[k]))&&date(v.customer_payment_reported_at)&&date(v.worker_receipt_confirmed_at)&&typeof v.settled==='boolean'&&typeof v.review_eligible==='boolean'&&Array.isArray(v.result_asset_ids)&&v.result_asset_ids.every(x=>typeof x==='string');}
export type InvoicesApi=ReturnType<typeof createInvoicesApi>;
export function createInvoicesApi(base:string|undefined,transport:typeof fetch=fetch){
 async function call<T>(path:string,token:string,validate:(v:unknown)=>v is T,method:'GET'|'PUT'|'POST'='GET',body?:unknown,key?:string):Promise<T>{
  if(!base||!/^https?:\/\//.test(base))throw new ApiError('CONFIG');return await requestJson(base.replace(/\/$/,'')+path,transport,undefined,undefined,validate,{...(method==='GET'?{method}:{method,body}),headers:{Authorization:'Bearer '+token,...(key?{'Idempotency-Key':key}:{})}}) as T;
 }
 const isAsset=(v:unknown):v is Asset=>record(v)&&typeof v.id==='string'&&['pending','ready','rejected'].includes(String(v.status))&&(v.download_url===null||typeof v.download_url==='string')&&date(v.expires_at);
 return {
  upload:async(token:string,blob:Blob,key:string)=>{
   const grant=await call('/assets/upload-grants',token,(v):v is {asset_id:string;upload_url:string;expires_at:string;required_headers:Record<string,string>}=>record(v)&&typeof v.asset_id==='string'&&typeof v.upload_url==='string'&&typeof v.expires_at==='string'&&record(v.required_headers),'POST',{purpose:'result',mime:blob.type,bytes:blob.size},key);
   const existing=await call('/assets/'+grant.asset_id,token,isAsset);if(existing.status==='ready')return existing;
   if(Date.parse(grant.expires_at)<=Date.now())throw new ApiError('VALIDATION');
   const response=await transport(grant.upload_url,{method:'PUT',headers:grant.required_headers,body:blob});
   if(!response.ok)throw new ApiError(response.status===400?'VALIDATION':response.status===404?'NOT_FOUND':'NETWORK',response.status);
   return call('/assets/'+grant.asset_id+'/complete',token,isAsset,'POST',{expected_version:1},key);
  },
  get:(token:string,job:string)=>call('/jobs/'+encodeURIComponent(job)+'/invoice',token,isInvoice),
  save:(token:string,job:string,input:InvoiceDraft,key:string)=>call('/jobs/'+encodeURIComponent(job)+'/invoice-draft',token,isInvoice,'PUT',input,key),
  change:async(token:string,id:string,action:InvoiceAction,input:InvoiceChange,key:string)=>{
   const path='/invoices/'+encodeURIComponent(id)+'/'+action;
   if(action==='settle'){const r=await call(path,token,(v):v is {invoice:Invoice;settlement_id:string;actor_kind:'worker'}=>record(v)&&isInvoice(v.invoice)&&typeof v.settlement_id==='string'&&v.actor_kind==='worker','POST',input,key);return r.invoice;}
   return call(path,token,isInvoice,'POST',input,key);
  },
  points:(token:string)=>call('/me/points',token,(v):v is PointWallet=>record(v)&&signed(v.balance)&&amount(v.held)&&amount(v.available)),
  wallet:(token:string,partner:string)=>call('/partners/'+encodeURIComponent(partner)+'/wallet',token,(v):v is Wallet=>record(v)&&typeof v.partner_id==='string'&&signed(v.balance)&&['fee_holds','withdrawal_holds','withdrawable','fee_credit_limit','shortfall'].every(k=>amount(v[k]))),
  ledger:(token:string,partner?:string,cursor?:string)=>call((partner?'/partners/'+encodeURIComponent(partner)+'/ledger':'/me/points/ledger')+(cursor?'?cursor='+encodeURIComponent(cursor):''),token,(v):v is LedgerPage=>record(v)&&Array.isArray(v.items)&&v.items.every(e=>record(e)&&typeof e.id==='string'&&typeof e.kind==='string'&&signed(e.amount)&&['VND','POINT'].includes(String(e.unit))&&typeof e.created_at==='string'&&date(e.created_at)&&typeof e.reference_id==='string')&&(v.next_cursor===null||typeof v.next_cursor==='string')),
  asset:(token:string,id:string)=>call('/assets/'+encodeURIComponent(id),token,(v):v is Asset=>record(v)&&typeof v.id==='string'&&['pending','ready','rejected'].includes(String(v.status))&&(v.download_url===null||typeof v.download_url==='string')&&date(v.expires_at)),
 };
}
