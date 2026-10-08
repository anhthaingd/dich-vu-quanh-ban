import { BadRequestException } from '@nestjs/common';
import { identifier, object } from '../accounts/accounts.input.js';
import { versionInput } from '../jobs/jobs.input.js';
import { textInput } from '../partners/partners.input.js';
export function amount(value: unknown): string {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value)) throw new BadRequestException();
  return value;
}
export function draftInput(value: unknown) {
  const v=object(value,['expected_version','labor','materials','note','result_asset_ids','industry_details']);
  const assets=v.result_asset_ids ?? [];
  if (!Array.isArray(assets) || new Set(assets).size!==assets.length) throw new BadRequestException();
  const details=v.industry_details ?? {};
  if (!details || typeof details!=='object' || Array.isArray(details)) throw new BadRequestException();
  return {expected_version:versionInput(v.expected_version),labor:amount(v.labor),materials:amount(v.materials),note:v.note===undefined?'':textInput(v.note,true,true),result_asset_ids:assets.map(identifier),industry_details:details};
}
export type DraftInput=ReturnType<typeof draftInput>;
export const actions=['send','revision-requests','confirm','payment-reported','settle'] as const;
export type InvoiceAction=typeof actions[number];
export type ActionInput={expected_version:number;draft_version_id?:string;version_id?:string;reason?:string;points_used?:string;confirmed?:boolean;received_in_full?:boolean};
export function actionInput(action:InvoiceAction,value:unknown):ActionInput {
 const fields={send:['draft_version_id'],'revision-requests':['reason'],confirm:['version_id','points_used'],'payment-reported':['version_id','confirmed'],settle:['version_id','received_in_full']}[action];
 const v=object(value,['expected_version',...fields]), result:ActionInput={expected_version:versionInput(v.expected_version)};
 if(action==='send')result.draft_version_id=identifier(v.draft_version_id);
 if(action==='revision-requests')result.reason=textInput(v.reason);
 if(['confirm','payment-reported','settle'].includes(action))result.version_id=identifier(v.version_id);
 if(action==='confirm')result.points_used=amount(v.points_used);
 if(action==='payment-reported'){if(v.confirmed!==true)throw new BadRequestException();result.confirmed=true;}
 if(action==='settle'){if(v.received_in_full!==true)throw new BadRequestException();result.received_in_full=true;}
 return result;
}
