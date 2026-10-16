import {requestJson} from '../../../lib/http/request';
import {ApiError} from '../../../lib/http/api-error';
import {record} from '../../jobs/api/jobs-api';
import {reportStates,type Report,type ReportPage,type ReportInput} from '../models';
export type EvidenceAsset={id:string;status:'pending'|'ready'|'rejected';download_url:string|null;expires_at:string|null};
const ids=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(i=>typeof i==='string');
const isAsset=(v:unknown):v is EvidenceAsset=>record(v)&&typeof v.id==='string'&&['pending','ready','rejected'].includes(String(v.status))&&(v.download_url===null||typeof v.download_url==='string')&&(v.expires_at===null||typeof v.expires_at==='string'&&Number.isFinite(Date.parse(v.expires_at)));
export function isReport(v:unknown):v is Report{return record(v)&&typeof v.id==='string'&&typeof v.body==='string'&&typeof v.subject==='string'&&ids(v.evidence_ids)&&reportStates.includes(v.state as Report['state'])&&['account','service','invoice','review'].includes(String(v.kind))&&Number.isSafeInteger(v.version)&&Number(v.version)>0&&(v.job_id===null||typeof v.job_id==='string')&&(v.invoice_id===null||typeof v.invoice_id==='string')&&Array.isArray(v.updates)&&v.updates.every(u=>record(u)&&typeof u.actor_id==='string'&&typeof u.body==='string'&&u.visibility==='participants'&&ids(u.evidence_ids)&&typeof u.created_at==='string'&&Number.isFinite(Date.parse(u.created_at)));}
function isPage(v:unknown):v is ReportPage{return record(v)&&Array.isArray(v.items)&&v.items.every(isReport)&&(v.next_cursor===null||typeof v.next_cursor==='string');}
export function createSupportApi(base:string|undefined,transport:typeof fetch=fetch){
 async function call<T>(path:string,token:string,validate:(v:unknown)=>v is T,body?:unknown,key?:string):Promise<T>{
  if(!base||!/^https?:\/\//.test(base))throw new ApiError('CONFIG');
  return await requestJson(base.replace(/\/$/,'')+path,transport,undefined,undefined,validate,{...(body?{method:'POST',body}:{method:'GET'}),headers:{Authorization:'Bearer '+token,...(key?{'Idempotency-Key':key}:{})}}) as T;
 }
 return {
  asset:(token:string,id:string)=>call('/assets/'+encodeURIComponent(id),token,isAsset),
  upload:async(token:string,blob:Blob,key:string)=>{
   const grant=await call('/assets/upload-grants',token,(v):v is {asset_id:string;upload_url:string;expires_at:string;required_headers:Record<string,string>}=>record(v)&&typeof v.asset_id==='string'&&typeof v.upload_url==='string'&&typeof v.expires_at==='string'&&Number.isFinite(Date.parse(v.expires_at))&&record(v.required_headers),{purpose:'evidence',mime:blob.type,bytes:blob.size},key);
   const existing=await call('/assets/'+grant.asset_id,token,isAsset);if(existing.status==='ready')return existing;
   if(Date.parse(grant.expires_at)<=Date.now())throw new ApiError('VALIDATION');
   const response=await transport(grant.upload_url,{method:'PUT',headers:grant.required_headers,body:blob});
   if(!response.ok)throw new ApiError(response.status===400?'VALIDATION':response.status===404?'NOT_FOUND':'NETWORK',response.status);
   return call('/assets/'+grant.asset_id+'/complete',token,isAsset,{expected_version:1},key);
  },
  list:(token:string,cursor?:string)=>call('/reports'+(cursor?'?cursor='+encodeURIComponent(cursor):''),token,isPage),
  get:(token:string,id:string)=>call('/reports/'+encodeURIComponent(id),token,isReport),
  create:(token:string,input:ReportInput,key:string)=>call('/reports',token,isReport,input,key),
  reply:(token:string,id:string,body:string,evidence_ids:string[],key:string)=>call('/reports/'+encodeURIComponent(id)+'/updates',token,isReport,{body,evidence_ids},key)};
}
export type SupportApi=ReturnType<typeof createSupportApi>;
