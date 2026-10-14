import {BadRequestException} from '@nestjs/common';
import {identifier,object,pageInput} from '../accounts/accounts.input.js';
import {contactInput} from '../auth/challenge.input.js';
export const permissions=['jobs.accept','jobs.assign','jobs.manage','profile.manage','members.manage','wallet.read','wallet.topup','wallet.withdraw','bank.manage','reviews.respond','reviews.write'] as const;
export function version(v:unknown):number {if(!Number.isSafeInteger(v)||Number(v)<1)throw new BadRequestException();return Number(v);}
export function reason(v:unknown):string {if(typeof v!=='string'||!v.trim()||v.length>1000)throw new BadRequestException();return v.trim();}
export function inviteInput(value:unknown){const v=object(value,['contact','permissions']);if(!Array.isArray(v.permissions)||v.permissions.length)throw new BadRequestException();return {...contactInput(v.contact),permissions:[] as string[]};}
export function tokenInput(value:unknown){const v=object(value,['token']);if(typeof v.token!=='string'||!/^[a-f0-9]{64}$/.test(v.token))throw new BadRequestException();return v.token;}
export function changeInput(value:unknown,withReason=true){const v=object(value,withReason?['expected_version','reason']:['expected_version']);return {expected_version:version(v.expected_version),reason:withReason?reason(v.reason):''};}
export function grantsInput(value:unknown){
 const v=object(value,['expected_version','permissions','reason','reauth_grant']);
 if(!Array.isArray(v.permissions)||v.permissions.some(p=>!permissions.includes(p))||new Set(v.permissions).size!==v.permissions.length||typeof v.reauth_grant!=='string'||!/^[a-f0-9]{64}$/.test(v.reauth_grant))throw new BadRequestException();
 if(v.permissions.some(p=>['wallet.topup','wallet.withdraw','bank.manage'].includes(p))&&!v.permissions.includes('wallet.read'))throw new BadRequestException();
 return {expected_version:version(v.expected_version),permissions:v.permissions as string[],reason:reason(v.reason),reauth_grant:v.reauth_grant};
}
export function contactEdit(value:unknown){const v=object(value,['expected_version','membership_id']);return {expected_version:version(v.expected_version),membership_id:v.membership_id===null?null:identifier(v.membership_id)};}
export function organizationQuery(value:Record<string,unknown>,filter:'status'|'active'){
 object(value,['limit','cursor',filter]);const page=pageInput({...(value.limit!==undefined?{limit:value.limit}:{}),...(value.cursor!==undefined?{cursor:value.cursor}:{})});
 const f=value[filter];if(f!==undefined&&(typeof f!=='string'||!(filter==='status'?['pending','accepted','expired','revoked','replaced']:['true','false']).includes(f)))throw new BadRequestException();
 return {...page,filter:f as string|undefined};
}
