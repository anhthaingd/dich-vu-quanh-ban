export const callStates=['ringing','accepted','declined','ended','busy','no_answer','failed','revoked'] as const;
export type CallState=typeof callStates[number];
export type Call={id:string;job_id:string;conversation_id:string;caller_id:string;recipient_id:string;state:CallState;version:number;created_at:string;answered_at:string|null;ended_at:string|null;ring_until:string};
export type CallTarget={user_id:string;display_name:string;role:'assigned'|'contact'|'customer'};
export type MediaToken={call_id:string;token:string;url:string;expires_at:string};
export const isActive=(c:Call)=>c.state==='ringing'||c.state==='accepted';
