import {BadRequestException} from '@nestjs/common';
import {identifier,object,pageInput} from '../accounts/accounts.input.js';
export const domains=['reports','verifications','reviews'] as const;
export type Domain=typeof domains[number];
// Error reasons are static UPPER_SNAKE names; fields name the input at fault. Never put request values here.
export const invalid=(reason:string,field?:string)=>new BadRequestException(field?{reason,field}:{reason});
/** Run a shared parser and replace its 400 with this caller's exact reason; other errors pass through unchanged. */
export function rethrow<T>(reason:string,field:string|undefined,parse:()=>T):T{try{return parse();}catch(e){if(e instanceof BadRequestException)throw invalid(reason,field);throw e;}}
export const pathId=(v:unknown,field?:string)=>rethrow('ID_INVALID',field,()=>identifier(v));
export const idempotencyKey=(v:unknown)=>rethrow('IDEMPOTENCY_KEY_REQUIRED',undefined,()=>identifier(v));
export const body=(v:unknown,allowed:string[])=>rethrow('ADMIN_BODY_UNEXPECTED',undefined,()=>object(v,allowed));
export const query=(v:unknown,allowed:string[])=>rethrow('ADMIN_QUERY_UNEXPECTED',undefined,()=>object(v,allowed));
export function version(v:unknown,field='expected_version'){if(!Number.isSafeInteger(v)||Number(v)<1)throw invalid('EXPECTED_VERSION_REQUIRED',field);return Number(v);}
/** Same rules as pageInput; limit and cursor get their own reason before the shared parser runs. */
export function page(q:Record<string,unknown>){
 query(q,['limit','cursor']);
 if(q.limit!==undefined&&(typeof q.limit!=='string'||!/^\d+$/.test(q.limit)||+q.limit<1||+q.limit>100))throw invalid('LIMIT_INVALID','limit');
 if(q.cursor!==undefined&&(typeof q.cursor!=='string'||!q.cursor||q.cursor.length>1024))throw invalid('CURSOR_INVALID','cursor');
 return rethrow('ADMIN_QUERY_UNEXPECTED',undefined,()=>pageInput(q));
}
export function domain(v:string):Domain {if(!domains.includes(v as Domain))throw invalid('ADMIN_DOMAIN_INVALID');return v as Domain;}
// Text rules per admin field: `<prefix>_REQUIRED` when empty, `<prefix>_TOO_LONG` above max.
export type TextRule={prefix:'ADMIN_REASON'|'ADMIN_NOTE'|'ADMIN_INVITEE_NAME'|'ADMIN_CATALOG_NAME';field:string};
export const reasonRule:TextRule={prefix:'ADMIN_REASON',field:'reason'};
export function text(v:unknown,max=4000,rule?:TextRule){
 if(typeof v!=='string'||!v.trim())throw rule?invalid(`${rule.prefix}_REQUIRED`,rule.field):new BadRequestException();
 if(v.length>max)throw rule?invalid(`${rule.prefix}_TOO_LONG`,rule.field):new BadRequestException();
 return v.trim();
}
export function queueInput(v:Record<string,unknown>){query(v,['q','state','cursor','limit']);
 if(v.q!==undefined&&(typeof v.q!=='string'||v.q.length>200))throw invalid('ADMIN_SEARCH_TOO_LONG','q');
 if(v.state!==undefined&&(typeof v.state!=='string'||v.state.length>40))throw invalid('ADMIN_STATE_FILTER_INVALID','state');
 return {...page({...(v.cursor===undefined?{}:{cursor:v.cursor}),...(v.limit===undefined?{}:{limit:v.limit})}),q:(v.q as string|undefined)?.trim()??'',state:(v.state as string|undefined)??'all'};}
export function decisionInput(value:unknown,d:Domain){const v=body(value,d==='reports'?['expected_version','state','reason']:['expected_version','action','reason',...(d==='verifications'?['checked']:[])]);const action=d==='reports'?v.state:v.action;
 const allowed=d==='reports'?['reviewing','awaiting_evidence','resolved','closed']:d==='reviews'?['keep','hide','unhide']:['approve','reject','request_evidence'];
 const expected=version(v.expected_version);
 if(!allowed.includes(String(action)))throw invalid('ADMIN_DECISION_INVALID',d==='reports'?'state':'action');
 if(v.checked!==undefined&&typeof v.checked!=='boolean')throw invalid('ADMIN_CHECKED_INVALID','checked');
 if(d==='verifications'&&action==='approve'&&v.checked!==true)throw invalid('ADMIN_VERIFICATION_CHECK_REQUIRED','checked');
 return {expected_version:expected,action:String(action),reason:text(v.reason,4000,reasonRule),checked:v.checked===true};
}

export function noteInput(value:unknown){const v=body(value,['expected_version','body']);return {expected_version:version(v.expected_version),body:text(v.body,4000,{prefix:'ADMIN_NOTE',field:'body'})};}

export function reportQueueInput(v:Record<string,unknown>){
 query(v,['q','state','cursor','limit','from','to','sort']);
 const {from,to,sort,...base}=v;
 if((from===undefined)!==(to===undefined))throw invalid('ADMIN_DATE_RANGE_INVALID',from===undefined?'from':'to');
 if(from!==undefined){
  if(typeof from!=='string'||!Number.isFinite(Date.parse(from)))throw invalid('ADMIN_DATE_INVALID','from');
  if(typeof to!=='string'||!Number.isFinite(Date.parse(to)))throw invalid('ADMIN_DATE_INVALID','to');
  if(Date.parse(from)>=Date.parse(to))throw invalid('ADMIN_DATE_RANGE_INVALID','to');
 }
 if(sort!==undefined&&!['newest','oldest'].includes(String(sort)))throw invalid('ADMIN_SORT_INVALID','sort');
 return {...queueInput(base),...(from===undefined?{}:{from:new Date(String(from)).toISOString(),to:new Date(String(to)).toISOString()}),sort:sort==='oldest'?'oldest' as const:'newest' as const};
}
