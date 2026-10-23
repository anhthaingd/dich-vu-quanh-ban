import {requestJson} from '../../../lib/http/request';
import {ApiError} from '../../../lib/http/api-error';
import {record} from '../../jobs/api/jobs-api';
import type {VerificationAsset} from '../../verification/api/verification-api';
export type Gallery={partner_id:string;version:number;asset_ids:string[]};
const gallery=(v:unknown):v is Gallery=>record(v)&&typeof v.partner_id==='string'&&Number.isSafeInteger(v.version)&&Array.isArray(v.asset_ids)&&v.asset_ids.length<=12&&v.asset_ids.every(id=>typeof id==='string');
const asset=(v:unknown):v is VerificationAsset=>record(v)&&typeof v.id==='string'&&['pending','ready','rejected'].includes(String(v.status))&&(v.download_url===null||typeof v.download_url==='string')&&(v.expires_at===null||typeof v.expires_at==='string');
export function createGalleryApi(base:string|undefined,transport:typeof fetch=fetch){
 async function call<T>(path:string,token:string|undefined,validate:(v:unknown)=>v is T,body?:unknown,key?:string,method:'POST'|'PUT'='POST'){
  if(!base||!/^https?:\/\//.test(base))throw new ApiError('CONFIG');
  return await requestJson(base.replace(/\/$/,'')+path,transport,undefined,undefined,validate,{...(body?{method,body}:{method:'GET'}),headers:{...(token?{Authorization:'Bearer '+token}:{}),...(key?{'Idempotency-Key':key}:{})}}) as T;
 }
 return {list:(id:string,token?:string)=>call('/partners/'+encodeURIComponent(id)+'/gallery',token,gallery),save:async(token:string,id:string,version:number,ids:string[],key:string)=>{await call('/partners/'+encodeURIComponent(id)+'/gallery',token,record,{expected_version:version,asset_ids:ids},key,'PUT');return call('/partners/'+encodeURIComponent(id)+'/gallery',token,gallery);},asset:(id:string,token?:string)=>call('/assets/'+encodeURIComponent(id),token,asset),upload:async(token:string,blob:Blob,key:string)=>{
  if(!['image/jpeg','image/png','image/webp'].includes(blob.type)||!blob.size||blob.size>10*1024*1024)throw new ApiError('VALIDATION');
  const grant=await call('/assets/upload-grants',token,(v):v is {asset_id:string;upload_url:string;expires_at:string;required_headers:Record<string,string>}=>record(v)&&typeof v.asset_id==='string'&&typeof v.upload_url==='string'&&typeof v.expires_at==='string'&&Number.isFinite(Date.parse(v.expires_at))&&record(v.required_headers),{purpose:'gallery',mime:blob.type,bytes:blob.size},key);
  const existing=await call('/assets/'+grant.asset_id,token,asset);if(existing.status==='ready')return existing;
  if(Date.parse(grant.expires_at)<=Date.now())throw new ApiError('VALIDATION');
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),20000);
  try{const r=await transport(grant.upload_url,{method:'PUT',headers:grant.required_headers,body:blob,signal:c.signal});if(!r.ok)throw new ApiError(r.status===400?'VALIDATION':r.status===404?'NOT_FOUND':'NETWORK');}finally{clearTimeout(timer);}
  return call('/assets/'+grant.asset_id+'/complete',token,asset,{expected_version:1},key);
 }};
}
