export type History={actor_id:string;action:string;reason:string;version:number;created_at:string};
export type Item={id:string;version:number;state?:string;kind?:string;subject?:string;body?:string;reporter_name?:string;partner_name?:string;details?:{kind:string;statement:string};stars?:number;hidden?:boolean;removed?:boolean;asset_id?:string|null;document_asset_ids?:string[];evidence_ids?:string[];updates?:{actor_id:string;body:string;created_at:string;evidence_ids:string[]}[];history:History[]};
export type Page={items:Item[];next_cursor:string|null};
export type Audit={id:string;domain:string;resource_id:string;actor_id:string;action:string;reason:string;version:number;created_at:string};
function object(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v);}
export function isItem(v:unknown):v is Item{return object(v)&&typeof v.id==='string'&&Number.isInteger(v.version)&&Number(v.version)>0&&Array.isArray(v.history)&&v.history.every(h=>object(h)&&typeof h.reason==='string'&&typeof h.action==='string'&&typeof h.created_at==='string')&&(typeof v.subject==='string'&&typeof v.body==='string'&&Array.isArray(v.evidence_ids)&&Array.isArray(v.updates)||typeof v.stars==='number'&&typeof v.body==='string'&&typeof v.hidden==='boolean'&&typeof v.removed==='boolean'||object(v.details)&&typeof v.details.statement==='string'&&Array.isArray(v.document_asset_ids));}

export type Domain = 'reports' | 'verifications' | 'reviews';
