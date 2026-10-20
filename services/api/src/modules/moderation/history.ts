import type {OperationDomain} from './operations.input.js';
import type {PoolClient} from 'pg';
import type {Domain} from './moderation.input.js';
export async function decisionHistory(db:PoolClient,domain:Domain|OperationDomain,id:string){const {rows}=await db.query('SELECT actor_id,action,reason,version,created_at FROM moderation_history WHERE domain=$1 AND resource_id=$2 ORDER BY created_at,id',[domain,id]);return rows.map(r=>({...r,created_at:r.created_at.toISOString()}));}
export async function recordDecision(db:PoolClient,domain:Domain|OperationDomain,id:string,user:string,action:string,reason:string,version:number){
 await db.query('INSERT INTO moderation_history(domain,resource_id,actor_id,action,reason,version) VALUES($1,$2,$3,$4,$5,$6)',[domain,id,user,action,reason,version]);
 await db.query('INSERT INTO audit_events(actor_id,action,resource_id,reason,details) VALUES($1,$2,$3,$4,$5)',[user,`admin.${domain}.${action}`,id,reason,JSON.stringify({version})]);
}
