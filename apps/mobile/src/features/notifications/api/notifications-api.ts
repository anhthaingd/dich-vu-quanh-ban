import {requestJson} from '../../../lib/http/request';
import {ApiError} from '../../../lib/http/api-error';
import {record,isPage} from '../../jobs/api/jobs-api';
import type {Page} from '../../jobs/models';
export type Notice={id:string;kind:string;resource_ref:{job_id?:string;conversation_id?:string;invoice_id?:string;schedule_version?:number;lead_seconds?:number};read_at:string|null;created_at:string};
export type NotificationSettings={message_push:boolean;call_push:boolean;service_push:boolean;reminder_push:boolean};
export const isSettings=(v:unknown):v is NotificationSettings=>record(v)&&['message_push','call_push','service_push','reminder_push'].every(k=>typeof v[k]==='boolean');
export const isNotice=(v:unknown):v is Notice=>record(v)&&typeof v.id==='string'&&typeof v.kind==='string'&&record(v.resource_ref)
  &&['job_id','conversation_id','invoice_id'].every(k=>v.resource_ref && (v.resource_ref as Record<string,unknown>)[k]===undefined || typeof (v.resource_ref as Record<string,unknown>)[k]==='string')
  &&(v.read_at===null||typeof v.read_at==='string'&&Number.isFinite(Date.parse(v.read_at)))&&typeof v.created_at==='string'&&Number.isFinite(Date.parse(v.created_at));
export type NotificationsApi={list:(token:string,cursor?:string)=>Promise<Page<Notice>>;read:(token:string,id:string,key:string)=>Promise<unknown>;settings:(token:string)=>Promise<NotificationSettings>;save:(token:string,input:NotificationSettings,key:string)=>Promise<NotificationSettings>};
export function createNotificationsApi(base:string|undefined,transport:typeof fetch=fetch):NotificationsApi{
  async function call<T>(path:string,token:string,validate:(v:unknown)=>v is T,method:'GET'|'POST'|'PUT'='GET',body?:unknown,key?:string):Promise<T>{
    if(!base||!/^https?:\/\//.test(base))throw new ApiError('CONFIG');
    return await requestJson(base.replace(/\/$/,'')+'/me/'+path,transport,undefined,undefined,validate,{...(method==='GET'?{method}:{method,body}),headers:{Authorization:`Bearer ${token}`,...(key?{'Idempotency-Key':key}:{})}}) as T;
  }
  return {list:(t,c)=>call('notifications'+(c?'?cursor='+encodeURIComponent(c):''),t,isPage(isNotice)),
    read:(t,id,k)=>call('notifications/'+encodeURIComponent(id)+'/read',t,(v):v is {id:string;state:string}=>record(v)&&v.id===id&&v.state==='read','POST',undefined,k),
    settings:t=>call('notification-settings',t,isSettings),save:(t,b,k)=>call('notification-settings',t,isSettings,'PUT',b,k)};
}
