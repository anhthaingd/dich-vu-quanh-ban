export type BankAccount={id:string;bank_code:string;account_last4:string;holder_name:string;status:string;version:number};
export type Bank={partner_id:string;version:number;current:BankAccount|null;pending:BankAccount|null};
export type FinanceHistory={actor_id:string;action:string;reason:string;version:number;bank_reference:string|null;created_at:string};
export type FinanceItem={id:string;partner_id:string;version:number;state:string;created_at:string;history:FinanceHistory[];amount?:string;bank_last4?:string|null;bank_snapshot?:{bank_code:string;account_last4:string;holder_name:string}|null;bank_reference?:string|null;evidence_id?:string|null;bank_code?:string;account_last4?:string;holder_name?:string;reason?:string};
export type FinancePage={items:FinanceItem[];next_cursor:string|null};
export type FinanceDomain='bank-accounts'|'topups'|'payouts';
