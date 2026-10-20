import {BadRequestException} from '@nestjs/common';
import {identifier,object} from '../accounts/accounts.input.js';
import {versionInput} from '../jobs/jobs.input.js';
import {textInput} from '../partners/partners.input.js';
export function completionInput(value:unknown){
 const v=object(value,['expected_version','invoice_id','invoice_version_id','invoice_expected_version','reason','evidence_ids','preview_token','checked']);
 if(v.checked!==true||!Array.isArray(v.evidence_ids)||!v.evidence_ids.length||new Set(v.evidence_ids).size!==v.evidence_ids.length||v.evidence_ids.length>100||typeof v.preview_token!=='string'||v.preview_token.length>8192)throw new BadRequestException();
 return {expected_version:versionInput(v.expected_version),invoice_id:identifier(v.invoice_id),invoice_version_id:identifier(v.invoice_version_id),invoice_expected_version:versionInput(v.invoice_expected_version),reason:textInput(v.reason),evidence_ids:v.evidence_ids.map(identifier).sort(),preview_token:v.preview_token,checked:true as const};
}
