import {BadRequestException} from '@nestjs/common';
import {object} from '../accounts/accounts.input.js';
import {text} from '../moderation/moderation.input.js';
export const permissions=['support.read','support.manage','moderation.manage','audit.read','finance.review','accounts.manage','catalog.manage','finance.read','reports.read','grant.manage'] as const;
export function grantsInput(value:unknown){const v=object(value,['expected_version','permissions','reason']);if(!Number.isSafeInteger(v.expected_version)||Number(v.expected_version)<1||!Array.isArray(v.permissions)||v.permissions.some(p=>!permissions.includes(p))||new Set(v.permissions).size!==v.permissions.length)throw new BadRequestException();return {expected_version:Number(v.expected_version),permissions:(v.permissions as string[]).sort(),reason:text(v.reason)};}
export type ReadDomain='jobs'|'invoices'|'grant-users';
export function metricsInput(value:Record<string,unknown>){object(value,['from','to']);const {from,to}=value;if(typeof from!=='string'||typeof to!=='string'||!/^\d{4}-\d\d-\d\dT/.test(from)||!/^\d{4}-\d\d-\d\dT/.test(to)||!Number.isFinite(Date.parse(from))||!Number.isFinite(Date.parse(to))||Date.parse(from)>=Date.parse(to))throw new BadRequestException();return {from:new Date(from).toISOString(),to:new Date(to).toISOString()};}
