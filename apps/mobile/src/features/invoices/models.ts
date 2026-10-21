export type Invoice={note:string;revision_reason:string|null;id:string;job_id:string;version:number;version_id:string;state:'draft'|'sent'|'revision_requested'|'locked'|'settled';labor:string;materials:string;total:string;points_used:string;cash_due:string;reward:string;customer_payment_reported_at:string|null;worker_receipt_confirmed_at:string|null;settled:boolean;review_eligible:boolean;result_asset_ids:string[]};
export type InvoiceDraft={expected_version:number;labor:string;materials:string;note?:string;result_asset_ids?:string[];industry_details?:Record<string,unknown>};
export type InvoiceAction='send'|'revision-requests'|'confirm'|'payment-reported'|'settle'|'receipt-confirmed';
export type InvoiceChange={expected_version:number;version_id?:string;draft_version_id?:string;reason?:string;points_used?:string;confirmed?:true;received_in_full?:true};
export type PointWallet={balance:string;held:string;available:string};
export type Wallet={partner_id:string;balance:string;fee_holds:string;withdrawal_holds:string;withdrawable:string;fee_credit_limit:string;shortfall:string};
export type Asset={id:string;status:'pending'|'ready'|'rejected';download_url:string|null;expires_at:string|null};

export type LedgerPage={items:{id:string;kind:string;amount:string;unit:'VND'|'POINT';created_at:string;reference_id:string}[];next_cursor:string|null};
