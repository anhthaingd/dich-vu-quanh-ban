import {BadRequestException} from '@nestjs/common';
import {object} from '../accounts/accounts.input.js';
import {bodyId} from '../chat/chat.input.js';
function content(v:unknown,field:'subject'|'body') { if(typeof v!=='string'||!v.trim())throw new BadRequestException({reason:field==='subject'?'SUPPORT_SUBJECT_REQUIRED':'SUPPORT_BODY_REQUIRED',field});return v.trim(); }
function evidence(v:unknown):string[] {
 if(v===undefined)return [];
 if(!Array.isArray(v))throw new BadRequestException({reason:'SUPPORT_EVIDENCE_INVALID',field:'evidence_ids'});
 const ids=v.map(x=>bodyId(x,'evidence_ids'));if(new Set(ids).size!==ids.length)throw new BadRequestException({reason:'SUPPORT_EVIDENCE_DUPLICATE',field:'evidence_ids'});return ids;
}
export function reportInput(body:unknown) {
 const v=object(body,['kind','subject','body','job_id','invoice_id','invoice_version_id','review_id','evidence_ids']);
 if(!['invoice','account','review','service'].includes(String(v.kind)))throw new BadRequestException({reason:'SUPPORT_KIND_INVALID',field:'kind'});
 const result={kind:v.kind as 'invoice'|'account'|'review'|'service',subject:content(v.subject,'subject'),body:content(v.body,'body'),evidence_ids:evidence(v.evidence_ids),
  job_id:v.job_id===undefined?null:bodyId(v.job_id,'job_id'),invoice_id:v.invoice_id===undefined?null:bodyId(v.invoice_id,'invoice_id'),
  invoice_version_id:v.invoice_version_id===undefined?null:bodyId(v.invoice_version_id,'invoice_version_id'),review_id:v.review_id===undefined?null:bodyId(v.review_id,'review_id')};
 if((result.kind==='invoice')!==!!result.invoice_id)throw new BadRequestException({reason:'SUPPORT_INVOICE_LINK_INVALID',field:'invoice_id'});
 if(!!result.invoice_id!==!!result.invoice_version_id)throw new BadRequestException({reason:'SUPPORT_INVOICE_VERSION_REQUIRED',field:'invoice_version_id'});
 if((result.kind==='review')!==!!result.review_id)throw new BadRequestException({reason:'SUPPORT_REVIEW_LINK_INVALID',field:'review_id'});
 return result;
}
export function reportReply(body:unknown){const v=object(body,['body','evidence_ids']);return {body:content(v.body,'body'),evidence_ids:evidence(v.evidence_ids)};}
