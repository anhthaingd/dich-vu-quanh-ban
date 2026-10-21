export type Review = { moderation_history?:{action:string;reason:string;created_at:string}[]; id:string; job_id:string; direction:'customer_to_partner'|'partner_to_customer'; author_id:string; stars:number; body:string; hidden:boolean; removed:boolean; version:number; asset_id:string|null; reply:{body:string;author_id:string}|null; allowed_actions:('edit'|'visibility'|'reply')[] };
export type ReviewPage = {items:Review[];next_cursor:string|null};
export type ReviewInput = {stars:number;body:string;asset_id?:string|null;expected_version?:number};
export type ReviewAsset={id:string;status:'pending'|'ready'|'rejected';download_url:string|null;expires_at:string|null};

export type CustomerReview={id:string;stars:number;body:string;reply:string|null;created_at:string};
export type CustomerReviewPage={items:CustomerReview[];next_cursor:string|null};
