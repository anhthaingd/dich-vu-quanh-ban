import {randomUUID} from 'expo-crypto';
import {requestJson} from '../../../lib/http/request';
import {ApiError} from '../../../lib/http/api-error';
import {isMe,isSession} from '../../auth/api/auth-api';
import type {Session} from '../../auth/models/auth.types';
export type Ack={id:string;state:string;version:number};
export type Challenge={id:string;expires_at:string;resend_after_seconds:number};
export type Receipt=Ack&{receipt_token:string};
export type RecoveryStatus=Ack&{reason?:string};
export type Obligations={blocked:boolean;reasons:string[];points:string};
const ack=(v:unknown):v is Ack=>!!v&&typeof v==='object'&&typeof (v as Ack).id==='string'&&typeof (v as Ack).state==='string'&&Number.isSafeInteger((v as Ack).version);
const challenge=(v:unknown):v is Challenge=>!!v&&typeof v==='object'&&typeof (v as Challenge).id==='string'&&Number.isFinite(Date.parse((v as Challenge).expires_at))&&typeof (v as Challenge).resend_after_seconds==='number';
export function createSecurityApi(base=process.env.EXPO_PUBLIC_API_URL,transport:typeof fetch=fetch){
 async function call<T>(path:string,valid:(v:unknown)=>v is T,body?:unknown,token?:string,receipt?:string,key?:string):Promise<T>{if(!base||!/^https?:\/\//.test(base))throw new ApiError('CONFIG');return await requestJson(base.replace(/\/$/,'')+path,transport,undefined,undefined,valid,body===undefined?{headers:{...(token?{Authorization:`Bearer ${token}`} :{}),...(receipt?{'X-Recovery-Token':receipt}:{}),...(key?{'Idempotency-Key':key}:{})}}:{method:'POST',body,headers:{...(token?{Authorization:`Bearer ${token}`} :{}),...(receipt?{'X-Recovery-Token':receipt}:{}),...(key?{'Idempotency-Key':key}:{})}}) as T;}
 return {
  challenge:(purpose:'login'|'reset'|'identity',contact:string,token?:string,password?:string,version?:number,key?:string)=>purpose==='identity'?call('/me/identity-change',challenge,{expected_version:version,kind:contact.startsWith('+')?'phone':'email',new_contact:contact,password},token,undefined,key??randomUUID()):call('/auth/security/challenges',challenge,{purpose,contact}),
  login:(id:string,code:string)=>call<Session>('/auth/security/confirm',isSession,{purpose:'login',challenge_id:id,code}),
  confirm:(purpose:'reset'|'identity'|'recovery',id:string,code:string,newPassword?:string,token?:string,receipt?:string,key?:string)=>purpose==='identity'?call('/me/identity-change/confirm',isMe,{challenge_id:id,code},token,undefined,key??randomUUID()):call(purpose==='reset'?'/auth/password/reset':'/auth/security/confirm',ack,{...(purpose==='reset'?{}:{purpose}),challenge_id:id,code,new_password:newPassword},token,receipt),
  password:(token:string,password:string,next:string)=>call('/me/password',ack,{password,new_password:next},token),
  preview:(token:string)=>call('/me/deletion-preview',(v):v is Obligations=>!!v&&typeof v==='object'&&typeof (v as Obligations).blocked==='boolean'&&Array.isArray((v as Obligations).reasons)&&typeof (v as Obligations).points==='string',undefined,token),
  deletion:(token:string,password:string,forfeit:boolean,version:number,reason:string)=>call('/me/deletion-request',ack,{expected_version:version,reason,password,forfeit_points:forfeit},token,undefined,randomUUID()),
  recover:(old:string,next:string,evidence:string,receiptToken:string)=>call('/auth/recovery-reports',(v):v is Receipt=>ack(v)&&typeof (v as Receipt).receipt_token==='string',{contact_claim:old,reachable_contact:next,description:evidence},undefined,receiptToken),
  status:(id:string,receipt:string)=>call<RecoveryStatus>('/auth/recovery-reports/'+encodeURIComponent(id),ack,undefined,undefined,receipt),
  supplement:(id:string,receipt:string,evidence:string)=>call('/auth/recovery-reports/'+encodeURIComponent(id)+'/evidence',ack,{evidence},undefined,receipt),
  recoveryChallenge:(id:string,receipt:string)=>call('/auth/recovery-reports/'+encodeURIComponent(id)+'/challenge',challenge,{},undefined,receipt),
 };
}
