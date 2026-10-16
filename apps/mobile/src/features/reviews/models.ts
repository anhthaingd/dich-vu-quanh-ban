export type Review = { id:string; job_id:string; direction:'customer_to_partner'|'partner_to_customer'; author_id:string; stars:number; body:string; hidden:boolean; removed:boolean; version:number };
export type ReviewPage = {items:Review[];next_cursor:string|null};
export type ReviewInput = {stars:number;body:string;expected_version?:number};
