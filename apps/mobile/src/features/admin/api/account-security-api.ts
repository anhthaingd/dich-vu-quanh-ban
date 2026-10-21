export type AccountCase={id:string;user_id:string|null;state:string;version:number;contact?:string;evidence?:string;application_reason?:string;reason?:string;obligations?:{blocked:boolean;reasons:string[];points:string}};
export type CaseDomain='recovery-reports'|'account-deletions';
export type SecurityAdminClient={request<T>(path:string,validate:(v:unknown)=>v is T,body?:unknown,key?:string):Promise<T>};
export const isCase=(v:unknown):v is AccountCase=>!!v&&typeof v==='object'&&typeof (v as AccountCase).id==='string'&&typeof (v as AccountCase).state==='string'&&Number.isSafeInteger((v as AccountCase).version);
export function accountSecurityClient(client:SecurityAdminClient){return {
 list:(domain:CaseDomain,cursor?:string,state:'all'|'pending'='all')=>client.request('/admin/'+domain+'?'+new URLSearchParams({state,...(cursor?{cursor}:{})}),(v):v is {items:AccountCase[];next_cursor:string|null}=>!!v&&typeof v==='object'&&Array.isArray((v as {items:unknown}).items)&&(v as {items:unknown[]}).items.every(isCase)&&((v as {next_cursor:unknown}).next_cursor===null||typeof (v as {next_cursor:unknown}).next_cursor==='string')),
 detail:(domain:CaseDomain,id:string)=>client.request('/admin/'+domain+'/'+encodeURIComponent(id),isCase),
 decide:(domain:CaseDomain,item:AccountCase,action:string,reason:string,key:string)=>client.request('/admin/'+domain+'/'+encodeURIComponent(item.id)+'/decision',isCase,{...(domain==='recovery-reports'?{decision:action==='evidence'?'request_evidence':action}:{action}),reason,expected_version:item.version},key)
 };}
