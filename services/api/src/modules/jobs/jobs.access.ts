import { NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
export async function memberAccess(db: PoolClient, partner: string, user: string) {
    const { rows: [m] } = await db.query(`SELECT m.id,m.is_owner,ARRAY(SELECT permission FROM membership_grants g WHERE g.membership_id=m.id AND g.revoked_at IS NULL) AS permissions FROM memberships m WHERE m.partner_id=$1 AND m.user_id=$2 AND m.active FOR SHARE`, [partner, user]);
    return m as {
        id: string;
        is_owner: boolean;
        permissions: string[];
    } | undefined;
}
export function hasPermission(m: Awaited<ReturnType<typeof memberAccess>>, permission: string) { return !!m && (m.is_owner || m.permissions.includes(permission)); }
export async function jobAccess(db: PoolClient, id: string, user: string) {
    // Partner first matches profile edits. AccountTransaction has already locked the actor.
    const { rows: [ref] } = await db.query('SELECT partner_id FROM jobs WHERE id=$1', [id]);
    if (!ref)
        throw new NotFoundException();
    await db.query('SELECT id FROM partners WHERE id=$1 FOR UPDATE', [ref.partner_id]);
    const { rows: [job] } = await db.query('SELECT * FROM jobs WHERE id=$1 FOR UPDATE', [id]);
    const member = await memberAccess(db, job.partner_id, user);
    const { rows: [assignment] } = await db.query('SELECT membership_id FROM assignments WHERE job_id=$1 AND ended_at IS NULL', [id]);
    const customer = job.customer_id === user, assigned = !!member && member.id === assignment?.membership_id;
    const manages = hasPermission(member, 'jobs.manage'), accepts = hasPermission(member, 'jobs.accept'), assigns = hasPermission(member, 'jobs.assign');
    if (!customer && !assigned && !manages && !accepts && !assigns)
        throw new NotFoundException();
    return { job, member, customer, assigned, manages, accepts, assigns, assigned_member_id: assignment?.membership_id ?? null };
}
export type JobAccess = Awaited<ReturnType<typeof jobAccess>>;
export function allowedActions(a: JobAccess): string[] {
    const actions: string[] = [];
    if (a.job.state === 'requested') {
        if (a.customer)
            actions.push('withdraw');
        if (a.accepts)
            actions.push('accept', 'decline');
    }
    if (a.job.state === 'accepted') {
        if (a.customer || a.manages || a.assigned)
            actions.push('reschedule', 'stop');
        if (a.assigns)
            actions.push('assignments');
    }
    if (a.job.state === 'awaiting_settlement' && a.assigns) actions.push('assignments');
    if (a.assigned && ['accepted','awaiting_settlement'].includes(a.job.state)) actions.push('invoice');
    if(a.assigned&&a.job.state==='completed')actions.push('confirm_receipt');
    return actions;
}
