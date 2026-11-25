import {requestJson} from '../../../lib/http/request';
import {ApiError} from '../../../lib/http/api-error';
import {record} from '../../jobs/api/jobs-api';
import type {VerificationAsset} from '../../verification/api/verification-api';
export type Gallery={partner_id:string;version:number;asset_ids:string[]};
const gallery=(v:unknown):v is Gallery=>record(v)&&typeof v.partner_id==='string'&&Number.isSafeInteger(v.version)&&Array.isArray(v.asset_ids)&&v.asset_ids.length<=12&&v.asset_ids.every(id=>typeof id==='string');
const asset=(v:unknown):v is VerificationAsset=>record(v)&&typeof v.id==='string'&&['pending','ready','rejected'].includes(String(v.status))&&(v.download_url===null||typeof v.download_url==='string')&&(v.expires_at===null||typeof v.expires_at==='string');
// Client-side photo checks use the same reasons as the API, so the person sees one exact message.
export function photoProblem(blob:{type:string;size:number}):string|undefined{
 if(!['image/jpeg','image/png','image/webp'].includes(blob.type))return 'ASSET_TYPE_UNSUPPORTED';
 if(!blob.size)return 'ASSET_SIZE_INVALID';
 if(blob.size>10*1024*1024)return 'ASSET_TOO_LARGE';
 return undefined;
}
const invalid=(reason:string)=>new ApiError('VALIDATION',undefined,undefined,undefined,undefined,reason);
// The upload URL is outside requestJson; read its error body the same way (code, reason, field only).
async function uploadError(r:Response):Promise<ApiError>{
 let body:Record<string,unknown>={};try{const v:unknown=await r.json();if(v&&typeof v==='object')body=v as Record<string,unknown>;}catch{/* unknown body stays generic */}
 const reason=typeof body.reason==='string'&&/^[A-Z][A-Z0-9_]{1,63}$/.test(body.reason)?body.reason:undefined;
 const code=r.status===400?'VALIDATION':r.status===404?'NOT_FOUND':r.status===409?(body.code==='IDEMPOTENCY_MISMATCH'?'IDEMPOTENCY_MISMATCH':'STATE_CONFLICT'):r.status===413?'PAYLOAD_TOO_LARGE':r.status===503?'SERVICE_UNAVAILABLE':r.status>=500?'INTERNAL':'NETWORK';
 const id=r.headers?.get('x-request-id')??undefined;
 return new ApiError(code,r.status,id&&/^[0-9a-f-]{36}$/i.test(id)?id:undefined,undefined,undefined,reason);
}
export function createGalleryApi(base:string|undefined,transport:typeof fetch=fetch){
 async function call<T>(path:string,token:string|undefined,validate:(v:unknown)=>v is T,body?:unknown,key?:string,method:'POST'|'PUT'='POST'){
  if(!base||!/^https?:\/\//.test(base))throw new ApiError('CONFIG');
  return await requestJson(base.replace(/\/$/,'')+path,transport,undefined,undefined,validate,{...(body?{method,body}:{method:'GET'}),headers:{...(token?{Authorization:'Bearer '+token}:{}),...(key?{'Idempotency-Key':key}:{})}}) as T;
 }
 return {list:(id:string,token?:string)=>call('/partners/'+encodeURIComponent(id)+'/gallery',token,gallery),save:async(token:string,id:string,version:number,ids:string[],key:string)=>{await call('/partners/'+encodeURIComponent(id)+'/gallery',token,record,{expected_version:version,asset_ids:ids},key,'PUT');return call('/partners/'+encodeURIComponent(id)+'/gallery',token,gallery);},asset:(id:string,token?:string)=>call('/assets/'+encodeURIComponent(id),token,asset),upload:async(token:string,blob:Blob,key:string)=>{
  const problem=photoProblem(blob);if(problem)throw invalid(problem);
  const grant=await call('/assets/upload-grants',token,(v):v is {asset_id:string;upload_url:string;expires_at:string;required_headers:Record<string,string>}=>record(v)&&typeof v.asset_id==='string'&&typeof v.upload_url==='string'&&typeof v.expires_at==='string'&&Number.isFinite(Date.parse(v.expires_at))&&record(v.required_headers),{purpose:'gallery',mime:blob.type,bytes:blob.size},key);
  const existing=await call('/assets/'+grant.asset_id,token,asset);if(existing.status==='ready')return existing;
  if(Date.parse(grant.expires_at)<=Date.now())throw invalid('ASSET_LINK_EXPIRED');
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),20000);
  try{const r=await transport(grant.upload_url,{method:'PUT',headers:grant.required_headers,body:blob,signal:c.signal});if(!r.ok)throw await uploadError(r);}finally{clearTimeout(timer);}
  return call('/assets/'+grant.asset_id+'/complete',token,asset,{expected_version:1},key);
 }};
}
