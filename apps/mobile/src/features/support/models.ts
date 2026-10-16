export const reportStates=['open','reviewing','awaiting_evidence','resolved','closed'] as const;
export type ReportState=typeof reportStates[number];
export type ReportKind='account'|'service'|'invoice'|'review';
export type Report={id:string;state:ReportState;version:number;kind:ReportKind;subject:string;body:string;evidence_ids:string[];job_id:string|null;invoice_id:string|null;updates:{actor_id:string;body:string;visibility:'participants';created_at:string;evidence_ids:string[]}[]};
export type ReportPage={items:Report[];next_cursor:string|null};
export type ReportInput={kind:ReportKind;subject:string;body:string;evidence_ids:string[];job_id?:string;invoice_id?:string;invoice_version_id?:string;review_id?:string};
export type ReportContext=Omit<ReportInput,'body'|'subject'|'evidence_ids'>;
