import {requestJson} from '../../../lib/http/request';
import {ApiError} from '../../../lib/http/api-error';
import {record} from '../../jobs/api/jobs-api';
export type Verification={id:string;partner_id:string;kind:'identity'|'business'|'professional';state:'pending'|'awaiting_evidence'|'approved'|'rejected';version:number;reason:string|null;details:{kind:string;statement:string};document_asset_ids:string[];created_at:string;history:{action:string;reason:string;created_at:string}[]};
export type VerificationInput={document_asset_ids:string[];details:{kind:Verification['kind'];statement:string};previous_request_id?:string;expected_version?:number};
export type VerificationPage={items:Verification[];next_cursor:string|null};
export type VerificationAsset={id:string;status:'pending'|'ready'|'rejected';download_url:string|null;expires_at:string|null};
const isAsset=(v:unknown):v is VerificationAsset=>record(v)&&typeof v.id==='string'&&['pending','ready','rejected'].includes(String(v.status))&&(v.download_url===null||typeof v.download_url==='string')&&(v.expires_at===null||typeof v.expires_at==='string');
export function isVerification(v:unknown):v is Verification{return record(v)&&typeof v.id==='string'&&typeof v.partner_id==='string'&&['identity','business','professional'].includes(String(v.kind))&&['pending','awaiting_evidence','approved','rejected'].includes(String(v.state))&&Number.isSafeInteger(v.version)&&Number(v.version)>0&&(v.reason===null||typeof v.reason==='string')&&record(v.details)&&v.details.kind===v.kind&&typeof v.details.statement==='string'&&Array.isArray(v.document_asset_ids)&&v.document_asset_ids.every(x=>typeof x==='string')&&typeof v.created_at==='string'&&Number.isFinite(Date.parse(v.created_at))&&Array.isArray(v.history)&&v.history.every(h=>record(h)&&typeof h.reason==='string'&&typeof h.action==='string'&&typeof h.created_at==='string'&&Number.isFinite(Date.parse(h.created_at)));}
function isPage(v:unknown):v is VerificationPage{return record(v)&&Array.isArray(v.items)&&v.items.every(isVerification)&&(v.next_cursor===null||typeof v.next_cursor==='string');}
export function createVerificationApi(base:string|undefined,transport:typeof fetch=fetch){
 async function call<T>(path:string,token:string,validate:(v:unknown)=>v is T,body?:unknown,key?:string):Promise<T>{
  if(!base||!/^https?:\/\//.test(base))throw new ApiError('CONFIG');
  return await requestJson(base.replace(/\/$/,'')+path,transport,undefined,undefined,validate,{...(body?{method:'POST',body}:{method:'GET'}),headers:{Authorization:'Bearer '+token,...(key?{'Idempotency-Key':key}:{})}}) as T;
 }
 return {
  asset:(token:string,id:string)=>call('/assets/'+encodeURIComponent(id),token,isAsset),
  upload:async(token:string,blob:Blob,key:string)=>{
   const grant=await call('/assets/upload-grants',token,(v):v is {asset_id:string;upload_url:string;expires_at:string;required_headers:Record<string,string>}=>record(v)&&typeof v.asset_id==='string'&&typeof v.upload_url==='string'&&typeof v.expires_at==='string'&&Number.isFinite(Date.parse(v.expires_at))&&record(v.required_headers),{purpose:'verification',mime:blob.type,bytes:blob.size},key);
   const existing=await call('/assets/'+grant.asset_id,token,isAsset);if(existing.status==='ready')return existing;
   if(Date.parse(grant.expires_at)<=Date.now())throw new ApiError('VALIDATION');
   const response=await transport(grant.upload_url,{method:'PUT',headers:grant.required_headers,body:blob});
   if(!response.ok)throw new ApiError(response.status===400?'VALIDATION':response.status===404?'NOT_FOUND':'NETWORK',response.status);
   return call('/assets/'+grant.asset_id+'/complete',token,isAsset,{expected_version:1},key);
  },
  list:(token:string,id:string,cursor?:string)=>call('/partners/'+encodeURIComponent(id)+'/verification'+(cursor?'?cursor='+encodeURIComponent(cursor):''),token,isPage),
  submit:(token:string,id:string,input:VerificationInput,key:string)=>call('/partners/'+encodeURIComponent(id)+'/verification',token,isVerification,input,key)};
}
export type VerificationApi=ReturnType<typeof createVerificationApi>;
