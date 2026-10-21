import {requestJson} from '../../../lib/http/request';
import {ApiError} from '../../../lib/http/api-error';
import {record,isPage} from '../../jobs/api/jobs-api';
import type {Page} from '../../jobs/models';
import {callStates,type Call,type CallTarget,type MediaToken} from '../models';
const date=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
export const isCall=(v:unknown):v is Call=>record(v)&&['id','job_id','conversation_id','caller_id','recipient_id'].every(k=>typeof v[k]==='string')&&(callStates as readonly unknown[]).includes(v.state)&&Number.isSafeInteger(v.version)&&Number(v.version)>0&&date(v.created_at)&&date(v.ring_until)&&[v.answered_at,v.ended_at].every(x=>x===null||date(x));
const isTargets=(v:unknown):v is {items:CallTarget[]}=>record(v)&&Array.isArray(v.items)&&v.items.every(x=>record(x)&&typeof x.user_id==='string'&&typeof x.display_name==='string'&&['assigned','contact','customer'].includes(String(x.role)));
const isMedia=(v:unknown):v is MediaToken=>record(v)&&typeof v.call_id==='string'&&typeof v.token==='string'&&v.token.length>20&&typeof v.url==='string'&&/^wss?:\/\//.test(v.url)&&date(v.expires_at);
export function createCallsApi(base=process.env.EXPO_PUBLIC_API_URL,transport:typeof fetch=fetch){
 async function request<T>(token:string,path:string,validate:(v:unknown)=>v is T,body?:unknown,key?:string){if(!base||!/^https?:\/\//.test(base))throw new ApiError('CONFIG');return await requestJson(base.replace(/\/$/,'')+path,transport,undefined,undefined,validate,{...(body===undefined?{method:'GET' as const}:{method:'POST' as const,body}),headers:{Authorization:`Bearer ${token}`,...(key?{'Idempotency-Key':key}:{})}}) as T;}
 return {
  targets:(token:string,job:string)=>request(token,`/jobs/${encodeURIComponent(job)}/call-targets`,isTargets),
  create:(token:string,job:string,recipient:string,key:string)=>request(token,'/calls',isCall,{job_id:job,recipient_id:recipient},key),
  list:(token:string,q:{active?:boolean;conversation_id?:string;cursor?:string}={})=>{const params=new URLSearchParams();if(q.active)params.set('active','true');if(q.conversation_id)params.set('conversation_id',q.conversation_id);if(q.cursor)params.set('cursor',q.cursor);return request<Page<Call>>(token,'/calls?'+params,isPage(isCall));},
  get:(token:string,id:string)=>request(token,`/calls/${encodeURIComponent(id)}`,isCall),
  action:(token:string,c:Call,action:'accept'|'decline'|'end'|'fail',key:string)=>request(token,`/calls/${encodeURIComponent(c.id)}/actions`,isCall,{expected_version:c.version,action},key),
  media:(token:string,id:string)=>request(token,`/calls/${encodeURIComponent(id)}/media`,isMedia,{}),
  heartbeat:(token:string,id:string)=>request(token,`/calls/${encodeURIComponent(id)}/heartbeat`,isCall,{})
 };
}
export type CallsApi=ReturnType<typeof createCallsApi>;
