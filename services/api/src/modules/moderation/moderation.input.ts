import {BadRequestException} from '@nestjs/common';
import {object,pageInput} from '../accounts/accounts.input.js';
export const domains=['reports','verifications','reviews'] as const;
export type Domain=typeof domains[number];
export function domain(v:string):Domain {if(!domains.includes(v as Domain))throw new BadRequestException();return v as Domain;}
export function text(v:unknown,max=4000){if(typeof v!=='string'||!v.trim()||v.length>max)throw new BadRequestException();return v.trim();}
export function queueInput(v:Record<string,unknown>){object(v,['q','state','cursor','limit']);if(v.q!==undefined&&(typeof v.q!=='string'||v.q.length>200)||v.state!==undefined&&(typeof v.state!=='string'||v.state.length>40))throw new BadRequestException();return {...pageInput({...(v.cursor===undefined?{}:{cursor:v.cursor}),...(v.limit===undefined?{}:{limit:v.limit})}),q:(v.q as string|undefined)?.trim()??'',state:(v.state as string|undefined)??'all'};}
export function decisionInput(value:unknown,d:Domain){const v=object(value,d==='reports'?['expected_version','state','reason']:['expected_version','action','reason',...(d==='verifications'?['checked']:[])]);const action=d==='reports'?v.state:v.action;
 const allowed=d==='reports'?['reviewing','awaiting_evidence','resolved','closed']:d==='reviews'?['keep','hide','unhide']:['approve','reject','request_evidence'];
 if(!Number.isSafeInteger(v.expected_version)||Number(v.expected_version)<1||!allowed.includes(String(action))||(v.checked!==undefined&&typeof v.checked!=='boolean')||(d==='verifications'&&action==='approve'&&v.checked!==true))throw new BadRequestException();
 return {expected_version:Number(v.expected_version),action:String(action),reason:text(v.reason),checked:v.checked===true};
}
