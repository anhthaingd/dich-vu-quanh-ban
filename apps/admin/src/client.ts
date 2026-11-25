// `code` is the value panels branch on. The rest only picks a precise message: `reason` is the
// API's exact cause, `field` the input it named (field_errors[0].field), `requestId` the
// server's request id, `status` the HTTP status and `timeout` an abandoned slow request.
export type ErrorDetail={reason?:string;field?:string;requestId?:string;status?:number;timeout?:boolean};
export class ClientError extends Error{
 readonly reason?:string;readonly field?:string;readonly requestId?:string;readonly status?:number;readonly timeout?:boolean;
 constructor(public code:string,detail:ErrorDetail={}){super(code);if(detail.reason)this.reason=detail.reason;if(detail.field)this.field=detail.field;if(detail.requestId)this.requestId=detail.requestId;if(detail.status)this.status=detail.status;if(detail.timeout)this.timeout=true;}
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,reasonPattern=/^[A-Z][A-Z0-9_]{1,63}$/,fieldPattern=/^[a-z][a-zA-Z0-9_.]{0,63}$/;
/** Reads `{ reason?, field_errors?: [{ field }], correlation_id }` and the x-request-id header; anything malformed is dropped. */
export function responseDetail(status:number,headers:{get(name:string):string|null}|undefined,body:unknown):ErrorDetail{
 const b=object(body)?body:{},header=headers?.get('x-request-id');
 const requestId=header&&uuid.test(header)?header:typeof b.correlation_id==='string'&&uuid.test(b.correlation_id)?b.correlation_id:undefined;
 const reason=typeof b.reason==='string'&&reasonPattern.test(b.reason)?b.reason:undefined;
 const first:unknown=Array.isArray(b.field_errors)?b.field_errors[0]:undefined,field=object(first)&&typeof first.field==='string'&&fieldPattern.test(first.field)?first.field:undefined;
 return {status,...(reason?{reason}:{}),...(field?{field}:{}),...(requestId?{requestId}:{})};
}
export type Session={access_token:string;refresh_token:string;expires_at:string;user:{id:string;admin_permissions:string[]}};
export type AdminSession={token:string;expires_at:string;fresh_until:string};
export type History={actor_id:string;action:string;reason:string;version:number;created_at:string};
export type Item={created_at?:string;name?:string;code?:string;parent_id?:string|null;category_ids?:string[];contacts?:{kind:string;value:string}[];open_jobs?:number;invoice_id?:string|null;id:string;version:number;state?:string;kind?:string;subject?:string;body?:string;reporter_name?:string;partner_name?:string;details?:{kind:string;statement:string};stars?:number;hidden?:boolean;removed?:boolean;asset_id?:string|null;document_asset_ids?:string[];evidence_ids?:string[];internal_notes?:{id:string;actor_id:string;body:string;created_at:string}[];updates?:{actor_id:string;body:string;created_at:string;evidence_ids:string[]}[];history:History[]};
export type Page={items:Item[];next_cursor:string|null};
export type Audit={id:string;resource_type:string;resource_id:string;actor_id:string|null;action:string;reason:string|null;created_at:string};
function object(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v);}
export function isItem(v:unknown):v is Item{return object(v)&&typeof v.id==='string'&&Number.isInteger(v.version)&&Number(v.version)>0&&(v.internal_notes===undefined||Array.isArray(v.internal_notes)&&v.internal_notes.every(n=>object(n)&&typeof n.id==='string'&&typeof n.body==='string'&&typeof n.created_at==='string'))&&Array.isArray(v.history)&&v.history.every(h=>object(h)&&typeof h.reason==='string'&&typeof h.action==='string'&&typeof h.created_at==='string')&&(typeof v.name==='string'&&typeof v.state==='string'||typeof v.subject==='string'&&typeof v.body==='string'&&Array.isArray(v.evidence_ids)&&Array.isArray(v.updates)||typeof v.stars==='number'&&typeof v.body==='string'&&typeof v.hidden==='boolean'&&typeof v.removed==='boolean'||object(v.details)&&typeof v.details.statement==='string'&&Array.isArray(v.document_asset_ids));}
export type Stored={session:Session;mfa:AdminSession|null};
export type CredentialStore={read():Stored|null;write(value:Stored):void;clear():void};
type Locks={request<T>(name:string,work:()=>Promise<T>):Promise<T>};
// B00-33 (owner decision 12/11/2026): the console keeps its sign-in and verified admin session across reloads
// and tabs. Refresh tokens are single use and a replay revokes the login, so tabs refresh under one lock and
// adopt a token another tab already rotated.
export function browserStore(key='dvqb.admin.console.v1'):CredentialStore{
 const local=()=>{try{return globalThis.localStorage??null;}catch{return null;}};
 return {
  read(){try{const v:unknown=JSON.parse(local()?.getItem(key)??'null');return object(v)&&isSession(v.session)&&(v.mfa===null||isAdminSession(v.mfa))?{session:v.session,mfa:v.mfa as AdminSession|null}:null;}catch{return null;}},
  write(value){try{local()?.setItem(key,JSON.stringify(value));}catch{/* memory only */}},
  clear(){try{local()?.removeItem(key);}catch{/* nothing stored */}},
 };
}
export class AdminClient {
 private current:Session|null=null;private admin:AdminSession|null=null;
 constructor(readonly base:string,private readonly transport:typeof fetch=globalThis.fetch.bind(globalThis),private readonly store?:CredentialStore){
  const stored=store?.read();if(stored){this.current=stored.session;this.admin=stored.mfa&&Date.parse(stored.mfa.expires_at)>Date.now()?stored.mfa:null;}
 }
 get session(){return this.current;}
 set session(v:Session|null){this.current=v;this.save();}
 get mfa(){return this.admin;}
 set mfa(v:AdminSession|null){this.admin=v;this.save();}
 private save(){if(!this.store)return;if(this.current)this.store.write({session:this.current,mfa:this.admin});else this.store.clear();}
 clear(){this.current=null;this.admin=null;this.save();}
 private async refresh(){
  const run=async()=>{
   const stored=this.store?.read();
   if(stored&&this.current&&stored.session.refresh_token!==this.current.refresh_token&&stored.session.user.id===this.current.user.id){this.current=stored.session;if(stored.mfa)this.admin=stored.mfa;return;}
   // Signed out elsewhere: the server revoked the family, so the refresh below answers 401 and clears.
   const refresh=await this.call('/auth/refresh','POST',{refresh_token:this.current!.refresh_token},undefined,false);if(!isSession(refresh)){this.clear();throw new ClientError('UNAUTHENTICATED');}this.session=refresh;
  };
  const locks=this.store?(globalThis.navigator as {locks?:Locks}|undefined)?.locks:undefined;
  return locks?locks.request('dvqb.admin.refresh',run):run();
 }
 async call(path:string,method='GET',body?:unknown,key?:string,retry=true):Promise<unknown>{
  let timedOut=false,status:number|undefined;const abort=new AbortController(),timer=setTimeout(()=>{timedOut=true;abort.abort();},20000);
  try{
   const r=await this.transport(this.base+path,{method,signal:abort.signal,cache:'no-store',headers:{'Content-Type':'application/json',...(this.session?{Authorization:'Bearer '+this.session.access_token}:{}),...(this.mfa?{'X-Admin-Session':this.mfa.token}:{}),...(key?{'Idempotency-Key':key}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
   if(r.status===401&&retry&&this.session&&path!=='/auth/refresh'){
    await this.refresh();return this.call(path,method,body,key,false);
   }
   status=r.status;let v:unknown;
   // An unreadable body keeps the old codes (NETWORK for error pages, so writes stay retryable); status and timeout pick the message.
   try{v=await r.json();}catch{throw new ClientError(r.ok&&!timedOut?'INVALID_RESPONSE':'NETWORK',{status:r.status,timeout:timedOut,...(timedOut?{}:responseDetail(r.status,r.headers,undefined))});}
   if(!r.ok){const code=object(v)&&typeof v.code==='string'?v.code:r.status===401?'UNAUTHENTICATED':r.status===403?'FORBIDDEN':'FAILED';if(r.status===401)this.clear();throw new ClientError(code,responseDetail(r.status,r.headers,v));}return v;
  }catch(e){if(e instanceof ClientError)throw e;throw new ClientError('NETWORK',{timeout:timedOut,...(status?{status}:{})});}finally{clearTimeout(timer);}
 }
 async login(email:string,password:string){const v=await this.call('/auth/login','POST',{email,password});if(!isSession(v))throw new ClientError('INVALID_RESPONSE');this.session=v;this.mfa=null;if(!v.user.admin_permissions.length){this.clear();throw new ClientError('FORBIDDEN',{reason:'ADMIN_ACCESS_REQUIRED'});}}
 async status(){const v=await this.call('/admin/auth/status');if(!object(v)||typeof v.enrolled!=='boolean')throw new ClientError('INVALID_RESPONSE');return v.enrolled;}
 async enroll(password:string){const v=await this.call('/admin/auth/enrollment','POST',{password});if(!object(v)||typeof v.secret!=='string'||typeof v.uri!=='string')throw new ClientError('INVALID_RESPONSE');return {secret:v.secret,uri:v.uri};}
 async verify(password:string,code:string,enrollment:boolean,recovery=false){const v=await this.call(recovery?'/admin/auth/recover':enrollment?'/admin/auth/enrollment/confirm':'/admin/auth/verify','POST',{password,code});if(!object(v)||typeof v.token!=='string'||typeof v.expires_at!=='string'||typeof v.fresh_until!=='string')throw new ClientError('INVALID_RESPONSE');this.mfa={token:v.token,expires_at:v.expires_at,fresh_until:v.fresh_until};}
 async replace(password:string){const v=await this.call('/admin/auth/replacement','POST',{password});if(!object(v)||typeof v.secret!=='string'||typeof v.uri!=='string')throw new ClientError('INVALID_RESPONSE');return {secret:v.secret,uri:v.uri};}
 async backupCodes(){const v=await this.call('/admin/auth/backup-codes','POST',{});if(!object(v)||!Array.isArray(v.codes)||v.codes.length!==10||!v.codes.every(c=>typeof c==='string'&&/^[a-f0-9]{32}$/.test(c)))throw new ClientError('INVALID_RESPONSE');return v.codes as string[];}
 async page(domain:string,query:string){const v=await this.call('/admin/'+domain+query);if(!object(v)||!Array.isArray(v.items)||!v.items.every(isItem)||!(v.next_cursor===null||typeof v.next_cursor==='string'))throw new ClientError('INVALID_RESPONSE');return v as Page;}
 async item(domain:string,id:string){const v=await this.call(`/admin/${domain}/${id}`);if(!isItem(v))throw new ClientError('INVALID_RESPONSE');return v;}
 async decision(domain:string,id:string,input:unknown,key:string){const v=await this.call(`/admin/${domain}/${id}/decision`,'POST',input,key);if(!isItem(v))throw new ClientError('INVALID_RESPONSE');return v;}
 async note(id:string,input:unknown,key:string){const v=await this.call(`/admin/reports/${id}/notes`,'POST',input,key);if(!isItem(v))throw new ClientError('INVALID_RESPONSE');return v;}
 async saveCatalog(domain:string,id:string|null,input:unknown,key:string){const v=await this.call('/admin/'+domain+(id?'/'+id:''),id?'PUT':'POST',input,key);if(!isItem(v))throw new ClientError('INVALID_RESPONSE');return v;}
 async completionPreview(id:string){const v=await this.call(`/admin/reports/${id}/completion-preview`);if(!isCompletionPreview(v))throw new ClientError('INVALID_RESPONSE');return v;}
 async complete(id:string,input:unknown,key:string){const v=await this.call(`/admin/reports/${id}/complete-on-behalf`,'POST',input,key);if(!isCompletionResult(v))throw new ClientError('INVALID_RESPONSE');return v;}
 async audit(cursor?:string,resourceId?:string){const v=await this.call('/admin/audit?'+new URLSearchParams({...(cursor?{cursor}:{}),...(resourceId?{resource_id:resourceId}:{})}));if(!object(v)||!Array.isArray(v.items)||!v.items.every(i=>object(i)&&typeof i.id==='string'&&(i.reason===null||typeof i.reason==='string')&&typeof i.action==='string'&&typeof i.resource_type==='string'&&typeof i.resource_id==='string'&&(i.actor_id===null||typeof i.actor_id==='string')&&typeof i.created_at==='string')||!(v.next_cursor===null||typeof v.next_cursor==='string'))throw new ClientError('INVALID_RESPONSE');return v as {items:Audit[];next_cursor:string|null};}
 async photo(id:string){let timedOut=false;const controller=new AbortController(),timer=setTimeout(()=>{timedOut=true;controller.abort();},20000);try{const r=await this.transport(this.base+`/assets/${id}/admin-content`,{signal:controller.signal,cache:'no-store',headers:{Authorization:'Bearer '+this.session?.access_token,'X-Admin-Session':this.mfa?.token??''}});if(!r.ok){let v:unknown;try{v=await r.json();}catch{/* not a JSON error body */}throw new ClientError(r.status===403?'FORBIDDEN':'FAILED',responseDetail(r.status,r.headers,v));}return await r.blob();}catch(e){if(e instanceof ClientError)throw e;throw new ClientError('NETWORK',{timeout:timedOut});}finally{clearTimeout(timer);}}
 async logout(){try{await this.call('/auth/logout','POST');}finally{this.clear();}}
 async lock(){try{await this.call('/admin/auth/lock','POST');}finally{this.mfa=null;}}
}
function isAdminSession(v:unknown):v is AdminSession{return object(v)&&typeof v.token==='string'&&typeof v.expires_at==='string'&&typeof v.fresh_until==='string';}
function isSession(v:unknown):v is Session{return object(v)&&typeof v.access_token==='string'&&typeof v.refresh_token==='string'&&typeof v.expires_at==='string'&&object(v.user)&&typeof v.user.id==='string'&&Array.isArray(v.user.admin_permissions)&&v.user.admin_permissions.every(p=>typeof p==='string');}

export type CompletionPreview={invoice_id:string;invoice_version_id:string;invoice_expected_version:number;total:string;cash_due:string;fee:string;points_used:string;reward:string;partner_delta:string;preview_token:string;expires_at:string};
export function isCompletionPreview(v:unknown):v is CompletionPreview{return object(v)&&typeof v.invoice_id==='string'&&typeof v.invoice_version_id==='string'&&Number.isInteger(v.invoice_expected_version)&&Number(v.invoice_expected_version)>0&&['total','cash_due','fee','points_used','reward'].every(k=>typeof v[k]==='string'&&/^(0|[1-9][0-9]*)$/.test(v[k] as string))&&typeof v.partner_delta==='string'&&/^-?(0|[1-9][0-9]*)$/.test(v.partner_delta)&&typeof v.preview_token==='string'&&typeof v.expires_at==='string'&&Number.isFinite(Date.parse(v.expires_at));}
export type CompletionResult={settlement_id:string;actor_kind:'admin';invoice:{id:string;settled:true;review_eligible:boolean}};
export function isCompletionResult(v:unknown):v is CompletionResult{return object(v)&&typeof v.settlement_id==='string'&&v.actor_kind==='admin'&&object(v.invoice)&&typeof v.invoice.id==='string'&&v.invoice.settled===true&&typeof v.invoice.review_eligible==='boolean';}
