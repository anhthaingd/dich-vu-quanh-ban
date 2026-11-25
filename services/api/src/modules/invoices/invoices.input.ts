import { identifier, object } from '../accounts/accounts.input.js';
import { invalid, versionInput, withReason } from '../jobs/jobs.input.js';
import { textInput } from '../partners/partners.input.js';
export function amount(value: unknown, reason: string, field: string): string {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value)) throw invalid(reason, field);
  return value;
}
export function draftInput(value: unknown) {
  const v=object(value,['expected_version','labor','materials','note','result_asset_ids','industry_details']);
  const assets=v.result_asset_ids ?? [];
  if (!Array.isArray(assets) || new Set(assets).size!==assets.length) throw invalid('INVOICE_PHOTOS_INVALID','result_asset_ids');
  const details=v.industry_details ?? {};
  if (!details || typeof details!=='object' || Array.isArray(details)) throw invalid('INVOICE_DETAILS_INVALID','industry_details');
  return {expected_version:versionInput(v.expected_version),labor:amount(v.labor,'INVOICE_LABOR_INVALID','labor'),materials:amount(v.materials,'INVOICE_MATERIALS_INVALID','materials'),note:v.note===undefined?'':withReason('INVOICE_NOTE_INVALID','note',()=>textInput(v.note,true,true)),result_asset_ids:assets.map(a=>withReason('INVOICE_PHOTOS_INVALID','result_asset_ids',()=>identifier(a))),industry_details:details};
}
export type DraftInput=ReturnType<typeof draftInput>;
export const actions=['send','revision-requests','confirm','payment-reported','settle','receipt-confirmed'] as const;
export type InvoiceAction=typeof actions[number];
export type ActionInput={expected_version:number;draft_version_id?:string;version_id?:string;reason?:string;points_used?:string;confirmed?:boolean;received_in_full?:boolean};
export function actionInput(action:InvoiceAction,value:unknown):ActionInput {
 const fields={send:['draft_version_id'],'revision-requests':['reason'],confirm:['version_id','points_used'],'payment-reported':['version_id','confirmed'],settle:['version_id','received_in_full'],'receipt-confirmed':['version_id','received_in_full']}[action];
 const v=object(value,['expected_version',...fields]), result:ActionInput={expected_version:versionInput(v.expected_version)};
 if(action==='send')result.draft_version_id=withReason('INVOICE_VERSION_ID_INVALID','draft_version_id',()=>identifier(v.draft_version_id));
 if(action==='revision-requests')result.reason=withReason('INVOICE_REVISION_REASON_REQUIRED','reason',()=>textInput(v.reason));
 if(['confirm','payment-reported','settle','receipt-confirmed'].includes(action))result.version_id=withReason('INVOICE_VERSION_ID_INVALID','version_id',()=>identifier(v.version_id));
 if(action==='confirm')result.points_used=amount(v.points_used,'INVOICE_POINTS_INVALID','points_used');
 if(action==='payment-reported'){if(v.confirmed!==true)throw invalid('INVOICE_PAYMENT_CONFIRMATION_REQUIRED','confirmed');result.confirmed=true;}
 if(action==='settle'||action==='receipt-confirmed'){if(v.received_in_full!==true)throw invalid('INVOICE_RECEIPT_CONFIRMATION_REQUIRED','received_in_full');result.received_in_full=true;}
 return result;
}
