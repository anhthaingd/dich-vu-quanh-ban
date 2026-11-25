import {body,invalid,page,query,queueInput,reasonRule,rethrow,text,version} from '../moderation/moderation.input.js';
import {identifier} from '../accounts/accounts.input.js';
export const permissions=['support.read','support.manage','moderation.manage','audit.read','finance.review','accounts.manage','catalog.manage','finance.read','reports.read','grant.manage'] as const;
export function grantsInput(value:unknown){const v=body(value,['expected_version','permissions','reason']);const expected=version(v.expected_version);
 if(!Array.isArray(v.permissions)||v.permissions.some(p=>!permissions.includes(p))||new Set(v.permissions).size!==v.permissions.length)throw invalid('ADMIN_PERMISSIONS_INVALID','permissions');
 return {expected_version:expected,permissions:(v.permissions as string[]).sort(),reason:text(v.reason,4000,reasonRule)};}
export type ReadDomain='jobs'|'invoices'|'grant-users';
const timestamp=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT/.test(v)&&Number.isFinite(Date.parse(v));
export function metricsInput(value:Record<string,unknown>){query(value,['from','to']);const {from,to}=value;
 if(!timestamp(from))throw invalid('ADMIN_DATE_INVALID','from');
 if(!timestamp(to))throw invalid('ADMIN_DATE_INVALID','to');
 if(Date.parse(from as string)>=Date.parse(to as string))throw invalid('ADMIN_DATE_RANGE_INVALID','to');
 return {from:new Date(from as string).toISOString(),to:new Date(to as string).toISOString()};}

export function auditInput(v:Record<string,unknown>){query(v,['resource_id','cursor','limit']);return {...page({...(v.cursor===undefined?{}:{cursor:v.cursor}),...(v.limit===undefined?{}:{limit:v.limit})}),resource_id:v.resource_id===undefined?undefined:rethrow('ID_INVALID','resource_id',()=>identifier(v.resource_id))};}

export function grantDirectoryInput(v:Record<string,unknown>){query(v,['q','state','cursor','limit','role']);const {role,...base}=v;if(role!==undefined&&!['all','admins','candidates'].includes(String(role)))throw invalid('ADMIN_ROLE_FILTER_INVALID','role');return {...queueInput(base),role:role as 'all'|'admins'|'candidates'|undefined};}
