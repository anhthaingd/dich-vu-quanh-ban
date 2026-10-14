import {requestJson} from '../../../lib/http/request';
import {ApiError} from '../../../lib/http/api-error';
import {record,isPage} from '../../jobs/api/jobs-api';
import type {Member} from '../../jobs/models';
import type {MyMembership,Invitation,Departure,Ack,Challenge} from '../models';
const integer=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>0;
const strings=(v:unknown)=>Array.isArray(v)&&v.every(x=>typeof x==='string');
const nullable=(v:unknown)=>v===null||typeof v==='string';
const member=(v:unknown):v is Member=>record(v)&&['id','user_id','display_name'].every(k=>typeof v[k]==='string')&&typeof v.active==='boolean'&&typeof v.is_owner==='boolean'&&integer(v.version)&&strings(v.permissions);
export const isMembership=(v:unknown):v is MyMembership=>record(v)&&['id','partner_id','partner_name'].every(k=>typeof v[k]==='string')&&['solo','shop','company'].includes(String(v.partner_kind))&&typeof v.active==='boolean'&&typeof v.is_owner==='boolean'&&integer(v.version)&&strings(v.permissions)&&nullable(v.left_at);
export const isInvitation=(v:unknown):v is Invitation=>record(v)&&['id','partner_id','contact_masked','created_at','expires_at'].every(k=>typeof v[k]==='string')&&integer(v.version)&&strings(v.permissions)&&['pending','accepted','expired','revoked','replaced'].includes(String(v.status))&&['queued','submitted','failed','unknown'].includes(String(v.delivery_state))&&nullable(v.replacement_id);
const ack=(v:unknown):v is Ack=>record(v)&&typeof v.id==='string'&&integer(v.version)&&typeof v.state==='string';
const challenge=(v:unknown):v is Challenge=>record(v)&&typeof v.id==='string'&&typeof v.expires_at==='string'&&Number.isFinite(Date.parse(v.expires_at))&&Number.isInteger(v.resend_after_seconds)&&Number(v.resend_after_seconds)>=0;
const departure=(v:unknown):v is Departure=>record(v)&&integer(v.membership_version)&&Number.isInteger(v.total)&&Number(v.total)>=0&&nullable(v.next_cursor)&&Array.isArray(v.items)&&v.items.every(i=>record(i)&&typeof i.id==='string'&&typeof i.state==='string'&&integer(i.version));
export function createOrganizationsApi(base:string|undefined,transport:typeof fetch=fetch){
 async function call<T>(path:string,token:string,validate:(v:unknown)=>v is T,method:'GET'|'POST'|'PUT'='GET',body?:unknown,key?:string):Promise<T>{
  if(!base||!/^https?:\/\//.test(base))throw new ApiError('CONFIG');
  return await requestJson(base.replace(/\/$/,'')+path,transport,undefined,undefined,validate,{...(method==='GET'?{method}:{method,body}),headers:{Authorization:'Bearer '+token,...(key?{'Idempotency-Key':key}:{})}}) as T;
 }
 const enc=encodeURIComponent,query=(cursor?:string)=>cursor?'?cursor='+enc(cursor):'';
 return {
  memberships:(t:string,c?:string)=>call('/me/memberships'+query(c),t,isPage(isMembership)),
  invitations:(t:string,p:string,c?:string)=>call('/partners/'+enc(p)+'/invitations'+query(c),t,isPage(isInvitation)),
  invite:(t:string,p:string,contact:string,key:string)=>call('/partners/'+enc(p)+'/invitations',t,ack,'POST',{contact,permissions:[]},key),
  accept:(t:string,token:string,key:string)=>call('/invitations/accept',t,member,'POST',{token},key),
  invitationChange:(t:string,id:string,action:'resend'|'revoke',version:number,reason:string,key:string)=>call('/invitations/'+enc(id)+'/'+action,t,isInvitation,'POST',{expected_version:version,...(action==='revoke'?{reason}:{})},key),
  preview:(t:string,id:string,c?:string)=>call('/memberships/'+enc(id)+'/departure-preview'+query(c),t,departure),
  leave:(t:string,id:string,version:number,reason:string,key:string)=>call('/memberships/'+enc(id)+'/leave',t,ack,'POST',{expected_version:version,reason},key),
  remove:(t:string,id:string,version:number,reason:string,key:string)=>call('/memberships/'+enc(id)+'/deactivate',t,member,'POST',{expected_version:version,reason},key),
  reauth:(t:string,password:string)=>call('/auth/reauthenticate',t,(v):v is {grant:string;expires_at:string}=>record(v)&&typeof v.grant==='string'&&typeof v.expires_at==='string','POST',{password}),
  grants:(t:string,id:string,version:number,permissions:string[],reason:string,grant:string,key:string)=>call('/memberships/'+enc(id)+'/grants',t,member,'PUT',{expected_version:version,permissions,reason,reauth_grant:grant},key),
  contact:(t:string,p:string)=>call('/partners/'+enc(p)+'/call-contact',t,(v):v is {partner_id:string;membership_id:string|null;version:number}=>record(v)&&typeof v.partner_id==='string'&&nullable(v.membership_id)&&integer(v.version)),
  setContact:(t:string,p:string,id:string|null,version:number,key:string)=>call('/partners/'+enc(p)+'/call-contact',t,ack,'PUT',{membership_id:id,expected_version:version},key),
  challenge:(t:string,contact:string)=>call('/auth/challenges',t,challenge,'POST',{contact,purpose:'verify'}),
  verify:(t:string,id:string,code:string)=>call('/auth/challenges/verify',t,ack,'POST',{challenge_id:id,code}),
 };
}
export type OrganizationsApi=ReturnType<typeof createOrganizationsApi>;
