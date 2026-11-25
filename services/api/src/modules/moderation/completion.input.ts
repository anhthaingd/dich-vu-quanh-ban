import {identifier} from '../accounts/accounts.input.js';
import {textInput} from '../partners/partners.input.js';
import {body,invalid,rethrow,version} from './moderation.input.js';
export function completionInput(value:unknown){
 const v=body(value,['expected_version','invoice_id','invoice_version_id','invoice_expected_version','reason','evidence_ids','preview_token','checked']);
 if(v.checked!==true)throw invalid('ADMIN_COMPLETION_CHECK_REQUIRED','checked');
 if(!Array.isArray(v.evidence_ids)||!v.evidence_ids.length)throw invalid('ADMIN_COMPLETION_EVIDENCE_REQUIRED','evidence_ids');
 if(new Set(v.evidence_ids).size!==v.evidence_ids.length||v.evidence_ids.length>100)throw invalid('ADMIN_COMPLETION_EVIDENCE_INVALID','evidence_ids');
 if(typeof v.preview_token!=='string'||v.preview_token.length>8192)throw invalid('ADMIN_COMPLETION_PREVIEW_INVALID','preview_token');
 return {expected_version:version(v.expected_version),invoice_id:rethrow('ID_INVALID','invoice_id',()=>identifier(v.invoice_id)),invoice_version_id:rethrow('ID_INVALID','invoice_version_id',()=>identifier(v.invoice_version_id)),invoice_expected_version:version(v.invoice_expected_version,'invoice_expected_version'),reason:rethrow('ADMIN_REASON_REQUIRED','reason',()=>textInput(v.reason)),evidence_ids:v.evidence_ids.map(e=>rethrow('ADMIN_COMPLETION_EVIDENCE_INVALID','evidence_ids',()=>identifier(e))).sort(),preview_token:v.preview_token,checked:true as const};
}
