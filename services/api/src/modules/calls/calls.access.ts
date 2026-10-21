import {NotFoundException} from '@nestjs/common';
import type {PoolClient} from 'pg';
export async function callTargets(db:PoolClient,job:string,user:string){
 const ref=(await db.query('SELECT partner_id FROM jobs WHERE id=$1',[job])).rows[0];if(!ref)throw new NotFoundException();
 await db.query('SELECT id FROM partners WHERE id=$1 FOR UPDATE',[ref.partner_id]);
 const j=(await db.query(`SELECT j.* FROM jobs j JOIN partners p ON p.id=j.partner_id WHERE j.id=$1 AND j.state IN ('accepted','completed') AND p.archived_at IS NULL AND p.moderation_status='active' FOR SHARE OF j`,[job])).rows[0];
 if(!j)throw new NotFoundException();
 const workers=(await db.query(`SELECT m.user_id,u.display_name,roles.role FROM memberships m JOIN users u ON u.id=m.user_id CROSS JOIN LATERAL (
 SELECT 'assigned' AS role WHERE EXISTS(SELECT 1 FROM assignments a WHERE a.job_id=$1 AND a.membership_id=m.id AND a.ended_at IS NULL)
 UNION SELECT 'contact' AS role WHERE m.id=(SELECT membership_id FROM partner_contacts WHERE partner_id=$2) OR (m.is_owner AND NOT EXISTS(SELECT 1 FROM partner_contacts WHERE partner_id=$2 AND membership_id IS NOT NULL))
 ) roles WHERE m.partner_id=$2 AND m.active AND u.status='active' AND m.user_id<>$3 ORDER BY m.user_id,roles.role`,[job,j.partner_id,j.customer_id])).rows;
 const customer=(await db.query("SELECT id AS user_id,display_name,'customer' AS role FROM users WHERE id=$1 AND status='active'",[j.customer_id])).rows[0];
 if(!customer)throw new NotFoundException();
 if(user===j.customer_id)return workers;
 if(workers.some(w=>w.user_id===user))return [customer];
 throw new NotFoundException();
}
export async function callRelation(db:PoolClient,c:{job_id:string;caller_id:string;recipient_id:string}){
 const targets=await callTargets(db,c.job_id,c.caller_id);if(!targets.some(t=>t.user_id===c.recipient_id))throw new NotFoundException();
}
