import {requestJson} from '../../../lib/http/request';
import {ApiError} from '../../../lib/http/api-error';
import {record} from '../../jobs/api/jobs-api';
import type {Review,ReviewPage,ReviewInput,ReviewAsset,CustomerReviewPage} from '../models';
export function isReview(v:unknown):v is Review {return record(v)&&(v.moderation_history===undefined||Array.isArray(v.moderation_history)&&v.moderation_history.every(h=>record(h)&&typeof h.action==='string'&&typeof h.reason==='string'&&typeof h.created_at==='string'&&Number.isFinite(Date.parse(h.created_at))))&&['id','job_id','author_id','body'].every(k=>typeof v[k]==='string')&&['customer_to_partner','partner_to_customer'].includes(String(v.direction))&&Number.isInteger(v.stars)&&Number(v.stars)>=1&&Number(v.stars)<=5&&typeof v.hidden==='boolean'&&typeof v.removed==='boolean'&&Number.isSafeInteger(v.version)&&Number(v.version)>0&&(v.asset_id===null||typeof v.asset_id==='string')&&(v.reply===null||record(v.reply)&&typeof v.reply.body==='string'&&typeof v.reply.author_id==='string')&&Array.isArray(v.allowed_actions)&&v.allowed_actions.every(a=>['edit','visibility','reply'].includes(a));}
export function isReviewPage(v:unknown):v is ReviewPage{return record(v)&&Array.isArray(v.items)&&v.items.every(isReview)&&(v.next_cursor===null||typeof v.next_cursor==='string');}
export type ReviewsApi=ReturnType<typeof createReviewsApi>;
export function createReviewsApi(base:string|undefined,transport:typeof fetch=fetch){
 async function call<T>(path:string,token:string|undefined,validate:(v:unknown)=>v is T,method:'GET'|'POST'|'PATCH'|'PUT'='GET',body?:unknown,key?:string):Promise<T>{
  if(!base||!/^https?:\/\//.test(base))throw new ApiError('CONFIG');
  return await requestJson(base.replace(/\/$/,'')+path,transport,undefined,undefined,validate,{...(method==='GET'?{method}:{method,body}),headers:{...(token?{Authorization:'Bearer '+token}:{}),...(key?{'Idempotency-Key':key}:{})}}) as T;
 }
 const page=(kind:'jobs'|'partners',id:string,cursor?:string)=>`/${kind}/${encodeURIComponent(id)}/reviews${cursor?'?cursor='+encodeURIComponent(cursor):''}`;
 const isAsset=(v:unknown):v is ReviewAsset=>record(v)&&typeof v.id==='string'&&['pending','ready','rejected'].includes(String(v.status))&&(v.download_url===null||typeof v.download_url==='string')&&(v.expires_at===null||typeof v.expires_at==='string'&&Number.isFinite(Date.parse(v.expires_at)));
 return {
  customerHistory:(token:string,job:string,cursor?:string)=>call('/jobs/'+encodeURIComponent(job)+'/customer-reviews'+(cursor?'?cursor='+encodeURIComponent(cursor):''),token,(v):v is CustomerReviewPage=>record(v)&&Array.isArray(v.items)&&v.items.every(r=>record(r)&&typeof r.id==='string'&&Number.isInteger(r.stars)&&Number(r.stars)>=1&&Number(r.stars)<=5&&typeof r.body==='string'&&(r.reply===null||typeof r.reply==='string')&&typeof r.created_at==='string'&&Number.isFinite(Date.parse(r.created_at)))&&(v.next_cursor===null||typeof v.next_cursor==='string')),
  asset:(id:string)=>call('/assets/'+encodeURIComponent(id),undefined,isAsset),
  reply:(token:string,id:string,expected_version:number,body:string,key:string)=>call('/reviews/'+encodeURIComponent(id)+'/reply',token,isReview,'PUT',{expected_version,body},key),
  upload:async(token:string,blob:Blob,key:string)=>{
   const grant=await call('/assets/upload-grants',token,(v):v is {asset_id:string;upload_url:string;expires_at:string;required_headers:Record<string,string>}=>record(v)&&typeof v.asset_id==='string'&&typeof v.upload_url==='string'&&typeof v.expires_at==='string'&&Number.isFinite(Date.parse(v.expires_at))&&record(v.required_headers),'POST',{purpose:'review',mime:blob.type,bytes:blob.size},key);
   const existing=await call('/assets/'+grant.asset_id,token,isAsset);if(existing.status==='ready')return existing;
   if(Date.parse(grant.expires_at)<=Date.now())throw new ApiError('VALIDATION');
   const response=await transport(grant.upload_url,{method:'PUT',headers:grant.required_headers,body:blob});
   if(!response.ok)throw new ApiError(response.status===400?'VALIDATION':response.status===404?'NOT_FOUND':'NETWORK',response.status);
   return call('/assets/'+grant.asset_id+'/complete',token,isAsset,'POST',{expected_version:1},key);
  },
  list:(token:string,job:string,cursor?:string)=>call(page('jobs',job,cursor),token,isReviewPage),
  publicList:(partner:string,cursor?:string)=>call(page('partners',partner,cursor),undefined,isReviewPage),
  create:(token:string,job:string,input:ReviewInput,key:string)=>call('/jobs/'+encodeURIComponent(job)+'/reviews',token,isReview,'POST',input,key),
  edit:(token:string,id:string,input:ReviewInput,key:string)=>call('/reviews/'+encodeURIComponent(id),token,isReview,'PATCH',input,key),
  visibility:(token:string,id:string,expected_version:number,removed:boolean,key:string)=>call('/reviews/'+encodeURIComponent(id)+'/visibility',token,isReview,'POST',{expected_version,removed},key),
 };
}
