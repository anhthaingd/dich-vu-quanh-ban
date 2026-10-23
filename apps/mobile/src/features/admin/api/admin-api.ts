import {ApiError} from '../../../lib/http/api-error';
import {requestJson} from '../../../lib/http/request';
import {record} from '../../jobs/api/jobs-api';
import type {AuthSession} from '../../auth/state/auth-session';
import {isCompletionPreview,isCompletionResult,isItem, type Item, type Audit, type Page, type Domain} from '../models';

type Mfa = {token:string;expires_at:string;fresh_until:string};
export class AdminApi {
  private mfa:Mfa|null = null;
  private generation = 0;
  constructor(private readonly manager:AuthSession, private readonly owner:string,
    private readonly base:string|undefined, private readonly transport:typeof fetch=globalThis.fetch.bind(globalThis)) {}
  get expiresAt(){return this.mfa ? Date.parse(this.mfa.expires_at) : 0;}
  clear(){this.generation++;this.mfa=null;}
  private async call<T>(path:string,validate:(v:unknown)=>v is T,body?:unknown,key?:string,method:'POST'|'PUT'='POST'):Promise<T> {
    if (!this.base || !/^https?:\/\//.test(this.base)) throw new ApiError('CONFIG');
    const generation=this.generation, mfa=this.mfa;
    const result=await this.manager.adminOperation(this.owner,token=>requestJson(this.base!.replace(/\/$/,'')+path,this.transport,undefined,undefined,validate,{
      ...(body===undefined?{method:'GET'}:{method,body}),
      headers:{Authorization:'Bearer '+token,...(mfa?{'X-Admin-Session':mfa.token}:{}),...(key?{'Idempotency-Key':key}:{})}
    }) as Promise<T>,body===undefined);
    if(generation!==this.generation)throw new ApiError('CANCELLED');
    return result;
  }
  request<T>(path:string,validate:(v:unknown)=>v is T,body?:unknown,key?:string,method:'POST'|'PUT'='POST'){return this.call(path,validate,body,key,method);}
  async status(){return (await this.call('/admin/auth/status',(v):v is {enrolled:boolean}=>record(v)&&typeof v.enrolled==='boolean')).enrolled;}
  enroll(password:string){return this.call('/admin/auth/enrollment',(v):v is {secret:string;uri:string}=>record(v)&&typeof v.secret==='string'&&typeof v.uri==='string',{password});}
  async verify(password:string,code:string,enrollment:boolean,recovery=false){
    this.mfa=await this.call(recovery?'/admin/auth/recover':enrollment?'/admin/auth/enrollment/confirm':'/admin/auth/verify',(v):v is Mfa=>record(v)&&typeof v.token==='string'&&typeof v.expires_at==='string'&&Number.isFinite(Date.parse(v.expires_at))&&typeof v.fresh_until==='string'&&Number.isFinite(Date.parse(v.fresh_until)),{password,code});
  }
  replace(password:string){return this.call('/admin/auth/replacement',(v):v is {secret:string;uri:string}=>record(v)&&typeof v.secret==='string'&&typeof v.uri==='string',{password});}
  async backupCodes(){return (await this.call('/admin/auth/backup-codes',(v):v is {codes:string[]}=>record(v)&&Array.isArray(v.codes)&&v.codes.length===10&&v.codes.every(c=>typeof c==='string'&&/^[a-f0-9]{32}$/.test(c)),{})).codes;}
  async lock(){this.clear();await this.call('/admin/auth/lock',(v):v is Record<string,unknown>=>record(v),{});}
  page(domain:Domain,q:string,state:string,cursor?:string){
    const params=new URLSearchParams({q,state,...(cursor?{cursor}:{})});
    return this.call('/admin/'+domain+'?'+params,(v):v is Page=>record(v)&&Array.isArray(v.items)&&v.items.every(isItem)&&(v.next_cursor===null||typeof v.next_cursor==='string'));
  }
  item(domain:Domain,id:string){return this.call('/admin/'+domain+'/'+encodeURIComponent(id),isItem);}
  decision(domain:Domain,id:string,input:unknown,key:string):Promise<Item>{return this.call('/admin/'+domain+'/'+encodeURIComponent(id)+'/decision',isItem,input,key);}
  note(id:string,input:unknown,key:string){return this.call('/admin/reports/'+encodeURIComponent(id)+'/notes',isItem,input,key);}
  saveCatalog(domain:Domain,id:string|null,input:unknown,key:string){return this.call('/admin/'+domain+(id?'/'+encodeURIComponent(id):''),isItem,input,key,id?'PUT':'POST');}
  completionPreview(id:string){return this.call('/admin/reports/'+encodeURIComponent(id)+'/completion-preview',isCompletionPreview);}
  complete(id:string,input:unknown,key:string){return this.call('/admin/reports/'+encodeURIComponent(id)+'/complete-on-behalf',isCompletionResult,input,key);}
  audit(cursor?:string,resourceId?:string){return this.call('/admin/audit?'+new URLSearchParams({...(cursor?{cursor}:{}),...(resourceId?{resource_id:resourceId}:{})}),(v):v is {items:Audit[];next_cursor:string|null}=>record(v)&&Array.isArray(v.items)&&v.items.every(i=>record(i)&&typeof i.id==='string'&&typeof i.resource_type==='string'&&typeof i.resource_id==='string'&&(i.actor_id===null||typeof i.actor_id==='string')&&typeof i.action==='string'&&(i.reason===null||typeof i.reason==='string')&&typeof i.created_at==='string')&&(v.next_cursor===null||typeof v.next_cursor==='string'));}
  async photo(id:string):Promise<string>{
    if(!this.base||!this.mfa)throw new ApiError('FORBIDDEN');
    const generation=this.generation,mfa=this.mfa;
    const uri=await this.manager.adminOperation(this.owner,async token=>{
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
      try{
        const r=await this.transport(this.base+'/assets/'+encodeURIComponent(id)+'/admin-content',{signal:controller.signal,cache:'no-store',headers:{Authorization:'Bearer '+token,'X-Admin-Session':mfa.token}});
        if(!r.ok)throw new ApiError(r.status===401?'UNAUTHENTICATED':r.status===403?'FORBIDDEN':'NETWORK',r.status);
        const blob=await r.blob();
        if(!['image/jpeg','image/png','image/webp'].includes(blob.type)||blob.size>10*1024*1024)throw new ApiError('INVALID_RESPONSE');
        return await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new ApiError('INVALID_RESPONSE'));reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(new ApiError('INVALID_RESPONSE'));reader.readAsDataURL(blob);});
      }catch(e){throw e instanceof ApiError?e:new ApiError('NETWORK');}finally{clearTimeout(timer);}
    },true);
    if(generation!==this.generation)throw new ApiError('CANCELLED');
    return uri;
  }
}
