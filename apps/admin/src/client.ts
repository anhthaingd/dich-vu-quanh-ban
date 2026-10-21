export class ClientError extends Error{constructor(public code:string){super(code);}}
export type Session={access_token:string;refresh_token:string;expires_at:string;user:{id:string;admin_permissions:string[]}};
export type AdminSession={token:string;expires_at:string;fresh_until:string};
export type History={actor_id:string;action:string;reason:string;version:number;created_at:string};
export type Item={name?:string;code?:string;parent_id?:string|null;category_ids?:string[];contacts?:{kind:string;value:string}[];open_jobs?:number;invoice_id?:string|null;id:string;version:number;state?:string;kind?:string;subject?:string;body?:string;reporter_name?:string;partner_name?:string;details?:{kind:string;statement:string};stars?:number;hidden?:boolean;removed?:boolean;asset_id?:string|null;document_asset_ids?:string[];evidence_ids?:string[];internal_notes?:{id:string;actor_id:string;body:string;created_at:string}[];updates?:{actor_id:string;body:string;created_at:string;evidence_ids:string[]}[];history:History[]};
export type Page={items:Item[];next_cursor:string|null};
export type Audit={id:string;domain:string;resource_id:string;actor_id:string;action:string;reason:string;version:number;created_at:string};
function object(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v);}
export function isItem(v:unknown):v is Item{return object(v)&&typeof v.id==='string'&&Number.isInteger(v.version)&&Number(v.version)>0&&(v.internal_notes===undefined||Array.isArray(v.internal_notes)&&v.internal_notes.every(n=>object(n)&&typeof n.id==='string'&&typeof n.body==='string'&&typeof n.created_at==='string'))&&Array.isArray(v.history)&&v.history.every(h=>object(h)&&typeof h.reason==='string'&&typeof h.action==='string'&&typeof h.created_at==='string')&&(typeof v.name==='string'&&typeof v.state==='string'||typeof v.subject==='string'&&typeof v.body==='string'&&Array.isArray(v.evidence_ids)&&Array.isArray(v.updates)||typeof v.stars==='number'&&typeof v.body==='string'&&typeof v.hidden==='boolean'&&typeof v.removed==='boolean'||object(v.details)&&typeof v.details.statement==='string'&&Array.isArray(v.document_asset_ids));}
export class AdminClient {
 session:Session|null=null;mfa:AdminSession|null=null;
 constructor(readonly base:string,private readonly transport:typeof fetch=globalThis.fetch.bind(globalThis)){}
 clear(){this.session=null;this.mfa=null;}
 async call(path:string,method='GET',body?:unknown,key?:string,retry=true):Promise<unknown>{
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),20000);
  try{
   const r=await this.transport(this.base+path,{method,signal:abort.signal,cache:'no-store',headers:{'Content-Type':'application/json',...(this.session?{Authorization:'Bearer '+this.session.access_token}:{}),...(this.mfa?{'X-Admin-Session':this.mfa.token}:{}),...(key?{'Idempotency-Key':key}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
   if(r.status===401&&retry&&this.session&&path!=='/auth/refresh'){
    const refresh=await this.call('/auth/refresh','POST',{refresh_token:this.session.refresh_token},undefined,false);if(!isSession(refresh)){this.clear();throw new ClientError('UNAUTHENTICATED');}this.session=refresh;return this.call(path,method,body,key,false);
   }
   const v=await r.json();if(!r.ok){const code=object(v)&&typeof v.code==='string'?v.code:r.status===401?'UNAUTHENTICATED':r.status===403?'FORBIDDEN':'FAILED';if(r.status===401)this.clear();throw new ClientError(code);}return v;
  }catch(e){if(e instanceof ClientError)throw e;throw new ClientError('NETWORK');}finally{clearTimeout(timer);}
 }
 async login(email:string,password:string){const v=await this.call('/auth/login','POST',{email,password});if(!isSession(v))throw new ClientError('INVALID_RESPONSE');this.session=v;this.mfa=null;if(!v.user.admin_permissions.length){this.clear();throw new ClientError('FORBIDDEN');}}
 async status(){const v=await this.call('/admin/auth/status');if(!object(v)||typeof v.enrolled!=='boolean')throw new ClientError('INVALID_RESPONSE');return v.enrolled;}
 async enroll(password:string){const v=await this.call('/admin/auth/enrollment','POST',{password});if(!object(v)||typeof v.secret!=='string'||typeof v.uri!=='string')throw new ClientError('INVALID_RESPONSE');return {secret:v.secret,uri:v.uri};}
 async verify(password:string,code:string,enrollment:boolean){const v=await this.call(enrollment?'/admin/auth/enrollment/confirm':'/admin/auth/verify','POST',{password,code});if(!object(v)||typeof v.token!=='string'||typeof v.expires_at!=='string'||typeof v.fresh_until!=='string')throw new ClientError('INVALID_RESPONSE');this.mfa={token:v.token,expires_at:v.expires_at,fresh_until:v.fresh_until};}
 async page(domain:string,query:string){const v=await this.call('/admin/'+domain+query);if(!object(v)||!Array.isArray(v.items)||!v.items.every(isItem)||!(v.next_cursor===null||typeof v.next_cursor==='string'))throw new ClientError('INVALID_RESPONSE');return v as Page;}
 async item(domain:string,id:string){const v=await this.call(`/admin/${domain}/${id}`);if(!isItem(v))throw new ClientError('INVALID_RESPONSE');return v;}
 async decision(domain:string,id:string,input:unknown,key:string){const v=await this.call(`/admin/${domain}/${id}/decision`,'POST',input,key);if(!isItem(v))throw new ClientError('INVALID_RESPONSE');return v;}
 async note(id:string,input:unknown,key:string){const v=await this.call(`/admin/reports/${id}/notes`,'POST',input,key);if(!isItem(v))throw new ClientError('INVALID_RESPONSE');return v;}
 async saveCatalog(domain:string,id:string|null,input:unknown,key:string){const v=await this.call('/admin/'+domain+(id?'/'+id:''),id?'PUT':'POST',input,key);if(!isItem(v))throw new ClientError('INVALID_RESPONSE');return v;}
 async completionPreview(id:string){const v=await this.call(`/admin/reports/${id}/completion-preview`);if(!isCompletionPreview(v))throw new ClientError('INVALID_RESPONSE');return v;}
 async complete(id:string,input:unknown,key:string){const v=await this.call(`/admin/reports/${id}/complete-on-behalf`,'POST',input,key);if(!isCompletionResult(v))throw new ClientError('INVALID_RESPONSE');return v;}
 async audit(cursor?:string){const v=await this.call('/admin/moderation-audit'+(cursor?'?cursor='+encodeURIComponent(cursor):''));if(!object(v)||!Array.isArray(v.items)||!v.items.every(i=>object(i)&&typeof i.id==='string'&&typeof i.reason==='string'&&typeof i.domain==='string'&&typeof i.created_at==='string')||!(v.next_cursor===null||typeof v.next_cursor==='string'))throw new ClientError('INVALID_RESPONSE');return v as {items:Audit[];next_cursor:string|null};}
 async photo(id:string){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);try{const r=await this.transport(this.base+`/assets/${id}/admin-content`,{signal:controller.signal,cache:'no-store',headers:{Authorization:'Bearer '+this.session?.access_token,'X-Admin-Session':this.mfa?.token??''}});if(!r.ok)throw new ClientError(r.status===403?'FORBIDDEN':'FAILED');return await r.blob();}finally{clearTimeout(timer);}}
 async logout(){try{await this.call('/auth/logout','POST');}finally{this.clear();}}
 async lock(){try{await this.call('/admin/auth/lock','POST');}finally{this.mfa=null;}}
}
function isSession(v:unknown):v is Session{return object(v)&&typeof v.access_token==='string'&&typeof v.refresh_token==='string'&&typeof v.expires_at==='string'&&object(v.user)&&typeof v.user.id==='string'&&Array.isArray(v.user.admin_permissions)&&v.user.admin_permissions.every(p=>typeof p==='string');}

export type CompletionPreview={invoice_id:string;invoice_version_id:string;invoice_expected_version:number;total:string;cash_due:string;fee:string;points_used:string;reward:string;partner_delta:string;preview_token:string;expires_at:string};
export function isCompletionPreview(v:unknown):v is CompletionPreview{return object(v)&&typeof v.invoice_id==='string'&&typeof v.invoice_version_id==='string'&&Number.isInteger(v.invoice_expected_version)&&Number(v.invoice_expected_version)>0&&['total','cash_due','fee','points_used','reward'].every(k=>typeof v[k]==='string'&&/^(0|[1-9][0-9]*)$/.test(v[k] as string))&&typeof v.partner_delta==='string'&&/^-?(0|[1-9][0-9]*)$/.test(v.partner_delta)&&typeof v.preview_token==='string'&&typeof v.expires_at==='string'&&Number.isFinite(Date.parse(v.expires_at));}
export type CompletionResult={settlement_id:string;actor_kind:'admin';invoice:{id:string;settled:true;review_eligible:boolean}};
export function isCompletionResult(v:unknown):v is CompletionResult{return object(v)&&typeof v.settlement_id==='string'&&v.actor_kind==='admin'&&object(v.invoice)&&typeof v.invoice.id==='string'&&v.invoice.settled===true&&typeof v.invoice.review_eligible==='boolean';}
