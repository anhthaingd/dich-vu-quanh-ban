import {BadRequestException} from '@nestjs/common';
import {object,pageInput} from '../accounts/accounts.input.js';
import {contactInput} from '../auth/challenge.input.js';
import {idField} from '../finance/finance.input.js';
export const permissions=['jobs.accept','jobs.assign','jobs.manage','profile.manage','members.manage','wallet.read','wallet.topup','wallet.withdraw','bank.manage','reviews.respond','reviews.write'] as const;
// Every 400 says which input failed (`field`) and why (`reason`); both are static strings.
const invalid=(reason:string,field:string)=>new BadRequestException({reason,field});
export function version(v:unknown):number {if(!Number.isSafeInteger(v)||Number(v)<1)throw invalid('EXPECTED_VERSION_REQUIRED','expected_version');return Number(v);}
export function reason(v:unknown):string {if(typeof v!=='string'||!v.trim()||v.length>1000)throw invalid('TEAM_REASON_INVALID','reason');return v.trim();}
export function inviteInput(value:unknown){const v=object(value,['contact','permissions']);if(!Array.isArray(v.permissions)||v.permissions.length)throw invalid('TEAM_INVITE_PERMISSIONS_NOT_ALLOWED','permissions');return {...contactInput(v.contact),permissions:[] as string[]};}
export function tokenInput(value:unknown){const v=object(value,['token']);if(typeof v.token!=='string'||!/^[a-f0-9]{64}$/.test(v.token))throw invalid('TEAM_INVITATION_TOKEN_INVALID','token');return v.token;}
export function changeInput(value:unknown,withReason=true){const v=object(value,withReason?['expected_version','reason']:['expected_version']);return {expected_version:version(v.expected_version),reason:withReason?reason(v.reason):''};}
export function grantsInput(value:unknown){
 const v=object(value,['expected_version','permissions','reason','reauth_grant']);
 if(!Array.isArray(v.permissions)||v.permissions.some(p=>!permissions.includes(p)))throw invalid('TEAM_PERMISSION_UNKNOWN','permissions');
 if(new Set(v.permissions).size!==v.permissions.length)throw invalid('TEAM_PERMISSION_DUPLICATE','permissions');
 if(typeof v.reauth_grant!=='string'||!/^[a-f0-9]{64}$/.test(v.reauth_grant))throw invalid('TEAM_REAUTH_GRANT_INVALID','reauth_grant');
 if(v.permissions.some(p=>['wallet.topup','wallet.withdraw','bank.manage'].includes(p))&&!v.permissions.includes('wallet.read'))throw invalid('TEAM_WALLET_READ_REQUIRED','permissions');
 return {expected_version:version(v.expected_version),permissions:v.permissions as string[],reason:reason(v.reason),reauth_grant:v.reauth_grant};
}
export function contactEdit(value:unknown){const v=object(value,['expected_version','membership_id']);return {expected_version:version(v.expected_version),membership_id:v.membership_id===null?null:idField(v.membership_id,'membership_id')};}
export function organizationQuery(value:Record<string,unknown>,filter:'status'|'active'){
 object(value,['limit','cursor',filter]);const page=pageInput({...(value.limit!==undefined?{limit:value.limit}:{}),...(value.cursor!==undefined?{cursor:value.cursor}:{})});
 const f=value[filter];if(f!==undefined&&(typeof f!=='string'||!(filter==='status'?['pending','accepted','expired','revoked','replaced']:['true','false']).includes(f)))throw invalid('TEAM_FILTER_INVALID',filter);
 return {...page,filter:f as string|undefined};
}
