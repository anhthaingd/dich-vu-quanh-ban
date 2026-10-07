import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { hasPermission, memberAccess } from '../jobs/jobs.access.js';
export async function conversationAccess(db: PoolClient, id: string, user: string) {
    const { rows: [c] } = await db.query('SELECT * FROM conversations WHERE id=$1', [id]);
    if (!c)
        throw new NotFoundException();
    if (c.kind === 'direct') {
        if (c.user_low !== user && c.user_high !== user)
            throw new NotFoundException();
    }
    else if (c.customer_id !== user) {
        await db.query('SELECT id FROM partners WHERE id=$1 FOR SHARE', [c.partner_id]);
        const m = await memberAccess(db, c.partner_id, user);
        if (!hasPermission(m, 'jobs.accept') && !hasPermission(m, 'jobs.manage'))
            throw new NotFoundException();
    }
    return c;
}
export async function directConversation(db: PoolClient, a: string, b: string) {
    if (a === b)
        throw new ForbiddenException();
    const [low, high] = [a, b].sort();
    const { rows: [c] } = await db.query(`INSERT INTO conversations(kind,user_low,user_high) VALUES('direct',$1,$2) ON CONFLICT(user_low,user_high) DO UPDATE SET user_low=EXCLUDED.user_low RETURNING id`, [low, high]);
    return c.id as string;
}
export async function partnerConversation(db: PoolClient, partner: string, customer: string) {
    const { rows: [p] } = await db.query('SELECT kind FROM partners WHERE id=$1', [partner]);
    if (!p)
        throw new NotFoundException();
    if (p.kind === 'solo') {
        const { rows: [owner] } = await db.query('SELECT user_id FROM memberships WHERE partner_id=$1 AND active AND is_owner', [partner]);
        if (!owner)
            throw new NotFoundException();
        return directConversation(db, customer, owner.user_id);
    }
    const { rows: [c] } = await db.query(`INSERT INTO conversations(kind,customer_id,partner_id) VALUES('partner',$1,$2) ON CONFLICT(customer_id,partner_id) DO UPDATE SET customer_id=EXCLUDED.customer_id RETURNING id`, [customer, partner]);
    return c.id as string;
}
export async function readConversation(db: PoolClient, id: string, user: string) {
    const { rows: [c] } = await db.query(`SELECT c.id,c.kind,(c.next_sequence-1)::int AS last_sequence,
    CASE WHEN c.kind='partner' AND c.customer_id=$2 THEN p.name WHEN c.kind='partner' THEN customer.display_name ELSE peer.display_name END AS display_name,
    (SELECT count(*)::int FROM messages m WHERE m.conversation_id=c.id AND m.sequence>COALESCE(r.last_sequence,0) AND m.sender_id IS DISTINCT FROM $2::uuid) AS unread,
    ARRAY(SELECT jc.job_id FROM job_conversations jc JOIN jobs j ON j.id=jc.job_id WHERE jc.conversation_id=c.id AND (j.customer_id=$2 OR EXISTS(SELECT 1 FROM memberships mm WHERE mm.partner_id=j.partner_id AND mm.user_id=$2 AND mm.active AND (mm.is_owner OR EXISTS(SELECT 1 FROM membership_grants g WHERE g.membership_id=mm.id AND g.revoked_at IS NULL AND g.permission IN ('jobs.accept','jobs.manage','jobs.assign')) OR EXISTS(SELECT 1 FROM assignments a WHERE a.job_id=j.id AND a.membership_id=mm.id AND a.ended_at IS NULL))))) AS job_ids
    FROM conversations c LEFT JOIN partners p ON p.id=c.partner_id LEFT JOIN users customer ON customer.id=c.customer_id
    LEFT JOIN users peer ON peer.id=CASE WHEN c.user_low=$2 THEN c.user_high ELSE c.user_low END
    LEFT JOIN conversation_reads r ON r.conversation_id=c.id AND r.user_id=$2 WHERE c.id=$1`, [id, user]);
    return c;
}
export async function event(db: PoolClient, key: string, id: string, version: number, type: string, payload: unknown) {
    await db.query(`INSERT INTO outbox_events(event_key,aggregate_id,aggregate_version,event_type,payload) VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_key) DO NOTHING`, [key, id, version, type, JSON.stringify(payload)]);
}
export async function systemMessage(db: PoolClient, conversation: string, job: string, key: string, body: string) {
    const { rows: [c] } = await db.query('UPDATE conversations SET next_sequence=next_sequence+1 WHERE id=$1 RETURNING next_sequence-1 AS sequence', [conversation]);
    const { rows: [m] } = await db.query(`INSERT INTO messages(conversation_id,sequence,system_event_key,body,job_id) VALUES($1,$2,$3,$4,$5) RETURNING id`, [conversation, c.sequence, key, body, job]);
    await event(db, key, conversation, Number(c.sequence), 'conversation.message_created.v1', { conversation_id: conversation, message_id: m.id, sequence: Number(c.sequence) });
}
