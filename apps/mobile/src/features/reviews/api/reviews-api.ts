import {requestJson} from '../../../lib/http/request';
import {ApiError} from '../../../lib/http/api-error';
import {record} from '../../jobs/api/jobs-api';
import type {Review,ReviewPage,ReviewInput} from '../models';
export function isReview(v:unknown):v is Review {return record(v)&&['id','job_id','author_id','body'].every(k=>typeof v[k]==='string')&&['customer_to_partner','partner_to_customer'].includes(String(v.direction))&&Number.isInteger(v.stars)&&Number(v.stars)>=1&&Number(v.stars)<=5&&typeof v.hidden==='boolean'&&typeof v.removed==='boolean'&&Number.isSafeInteger(v.version)&&Number(v.version)>0;}
export function isReviewPage(v:unknown):v is ReviewPage{return record(v)&&Array.isArray(v.items)&&v.items.every(isReview)&&(v.next_cursor===null||typeof v.next_cursor==='string');}
export type ReviewsApi=ReturnType<typeof createReviewsApi>;
export function createReviewsApi(base:string|undefined,transport:typeof fetch=fetch){
 async function call<T>(path:string,token:string|undefined,validate:(v:unknown)=>v is T,method:'GET'|'POST'|'PATCH'='GET',body?:unknown,key?:string):Promise<T>{
  if(!base||!/^https?:\/\//.test(base))throw new ApiError('CONFIG');
  return await requestJson(base.replace(/\/$/,'')+path,transport,undefined,undefined,validate,{...(method==='GET'?{method}:{method,body}),headers:{...(token?{Authorization:'Bearer '+token}:{}),...(key?{'Idempotency-Key':key}:{})}}) as T;
 }
 const page=(kind:'jobs'|'partners',id:string,cursor?:string)=>`/${kind}/${encodeURIComponent(id)}/reviews${cursor?'?cursor='+encodeURIComponent(cursor):''}`;
 return {
  list:(token:string,job:string,cursor?:string)=>call(page('jobs',job,cursor),token,isReviewPage),
  publicList:(partner:string,cursor?:string)=>call(page('partners',partner,cursor),undefined,isReviewPage),
  create:(token:string,job:string,input:ReviewInput,key:string)=>call('/jobs/'+encodeURIComponent(job)+'/reviews',token,isReview,'POST',input,key),
  edit:(token:string,id:string,input:ReviewInput,key:string)=>call('/reviews/'+encodeURIComponent(id),token,isReview,'PATCH',input,key),
  visibility:(token:string,id:string,expected_version:number,removed:boolean,key:string)=>call('/reviews/'+encodeURIComponent(id)+'/visibility',token,isReview,'POST',{expected_version,removed},key),
 };
}
