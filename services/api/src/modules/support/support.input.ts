import {BadRequestException} from '@nestjs/common';
import {identifier,object} from '../accounts/accounts.input.js';
function content(v:unknown) { if(typeof v!=='string'||!v.trim())throw new BadRequestException();return v.trim(); }
function evidence(v:unknown):string[] {
 if(v===undefined)return [];
 if(!Array.isArray(v))throw new BadRequestException();
 const ids=v.map(identifier);if(new Set(ids).size!==ids.length)throw new BadRequestException();return ids;
}
export function reportInput(body:unknown) {
 const v=object(body,['kind','subject','body','job_id','invoice_id','invoice_version_id','review_id','evidence_ids']);
 if(!['invoice','account','review','service'].includes(String(v.kind)))throw new BadRequestException();
 const result={kind:v.kind as 'invoice'|'account'|'review'|'service',subject:content(v.subject),body:content(v.body),evidence_ids:evidence(v.evidence_ids),
  job_id:v.job_id===undefined?null:identifier(v.job_id),invoice_id:v.invoice_id===undefined?null:identifier(v.invoice_id),
  invoice_version_id:v.invoice_version_id===undefined?null:identifier(v.invoice_version_id),review_id:v.review_id===undefined?null:identifier(v.review_id)};
 if((result.kind==='invoice')!==!!result.invoice_id||!!result.invoice_id!==!!result.invoice_version_id||(result.kind==='review')!==!!result.review_id)throw new BadRequestException();
 return result;
}
export function reportReply(body:unknown){const v=object(body,['body','evidence_ids']);return {body:content(v.body),evidence_ids:evidence(v.evidence_ids)};}
