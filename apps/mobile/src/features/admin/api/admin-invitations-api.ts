import {requestJson} from '../../../lib/http/request';
import {ApiError} from '../../../lib/http/api-error';
import {record} from '../../jobs/api/jobs-api';
export type InvitationPreview={id:string;name:string;permissions:string[];expires_at:string};
export function createAdminInvitationsApi(base:string|undefined,transport:typeof fetch=fetch){
 async function call<T>(path:string,access:string,token:string,validate:(v:unknown)=>v is T,key?:string){
  if(!base||!/^https?:\/\//.test(base))throw new ApiError('CONFIG');
  return requestJson(base.replace(/\/$/,'')+path,transport,undefined,undefined,validate,{method:'POST',body:{token},headers:{Authorization:'Bearer '+access,...(key?{'Idempotency-Key':key}:{})}}) as Promise<T>;
 }
 return {preview:(access:string,token:string)=>call('/admin-invitations/preview',access,token,(v):v is InvitationPreview=>record(v)&&typeof v.id==='string'&&typeof v.name==='string'&&typeof v.expires_at==='string'&&Number.isFinite(Date.parse(v.expires_at))&&Array.isArray(v.permissions)&&v.permissions.every(p=>typeof p==='string')),accept:(access:string,token:string,key:string)=>call('/admin-invitations/accept',access,token,(v):v is {id:string;status:'accepted';requires_mfa:true}=>record(v)&&typeof v.id==='string'&&v.status==='accepted'&&v.requires_mfa===true,key)};
}
