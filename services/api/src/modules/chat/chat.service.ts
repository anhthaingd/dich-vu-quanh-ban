import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import type { AuthService } from '../auth/auth.service.js';
import { AccountTransaction } from '../accounts/account-transaction.js';
import type { PageInput } from '../accounts/accounts.input.js';
import type { Cursor } from '../../common/http/cursor.js';
import { jobAccess, memberAccess } from '../jobs/jobs.access.js';
import { conversationAccess, directConversation, event, partnerConversation, readConversation } from './chat.store.js';
import type { conversationInput, messageInput, messagesQuery } from './chat.input.js';
type MessageRow = {
    id: string;
    conversation_id: string;
    sequence: string;
    sender_id: string | null;
    body: string;
    asset_id: string | null;
    job_id: string | null;
    created_at: Date;
};
const dto = (m: MessageRow) => ({ id: m.id, conversation_id: m.conversation_id, sequence: Number(m.sequence), sender_id: m.sender_id, body: m.body, asset_id: m.asset_id, job_id: m.job_id, created_at: m.created_at.toISOString() });
export class ChatService {
    private readonly tx: AccountTransaction;
    constructor(private readonly pool: Pool, private readonly auth: AuthService, private readonly cursor: Cursor) { this.tx = new AccountTransaction(pool, auth); }
    private async readTx<T>(header: string | undefined, work: (db: PoolClient, user: string) => Promise<T>) {
        const db = await this.pool.connect();
        try {
            await db.query('BEGIN');
            const actor = await this.auth.authenticate(header, db);
            const value = await work(db, actor.user.id);
            await db.query('COMMIT');
            return value;
        }
        catch (e) {
            await db.query('ROLLBACK');
            throw e;
        }
        finally {
            db.release();
        }
    }
    open(header: string | undefined, input: ReturnType<typeof conversationInput>, key: string) {
        return this.tx.run(header, 'openConversation', key, input, async (db, actor) => {
            let id: string;
            if (input.partner_id) {
                const { rows: [p] } = await db.query("SELECT id FROM partners WHERE id=$1 AND publication_status='published' AND moderation_status<>'suspended' AND archived_at IS NULL FOR UPDATE", [input.partner_id]);
                if (!p)
                    throw new NotFoundException();
                if (await memberAccess(db, p.id, actor.user.id))
                    throw new ForbiddenException();
                id = await partnerConversation(db, p.id, actor.user.id);
            }
            else {
                if (actor.user.id === input.peer_user_id)
                    throw new ForbiddenException();
                const { rows: [existing] } = await db.query("SELECT id FROM conversations WHERE kind='direct' AND user_low=LEAST($1::uuid,$2::uuid) AND user_high=GREATEST($1::uuid,$2::uuid)", [actor.user.id, input.peer_user_id]);
                if (existing)
                    id = existing.id;
                else {
                    const { rows: [peer] } = await db.query("SELECT u.id FROM users u JOIN memberships m ON m.user_id=u.id JOIN partners p ON p.id=m.partner_id WHERE u.id=$1 AND u.status='active' AND m.active AND m.is_owner AND p.kind='solo' AND p.publication_status='published' AND p.moderation_status<>'suspended' AND p.archived_at IS NULL LIMIT 1", [input.peer_user_id]);
                    if (!peer)
                        throw new NotFoundException();
                    id = await directConversation(db, actor.user.id, peer.id);
                }
            }
            return readConversation(db, id, actor.user.id);
        }, async (db, actor) => {
            const { rows: [old] } = await db.query("SELECT response_snapshot->>'id' AS id FROM idempotency_keys WHERE actor_id=$1 AND operation='openConversation' AND request_key=$2", [actor.user.id, key]);
            if (old)
                await conversationAccess(db, old.id, actor.user.id);
        });
    }
    list(header: string | undefined, q: PageInput) {
        return this.readTx(header, async (db, user) => {
            const scope = `conversations:${user}`, start = this.cursor.decode(q.cursor, scope);
            const { rows } = await db.query(`SELECT c.id,c.created_at FROM conversations c WHERE (user_low=$1 OR user_high=$1 OR customer_id=$1 OR EXISTS(SELECT 1 FROM memberships m WHERE m.partner_id=c.partner_id AND m.user_id=$1 AND m.active AND (m.is_owner OR EXISTS(SELECT 1 FROM membership_grants g WHERE g.membership_id=m.id AND g.revoked_at IS NULL AND g.permission IN ('jobs.accept','jobs.manage'))))) AND ($2::timestamptz IS NULL OR (c.created_at,c.id)<($2::timestamptz,$3::uuid)) ORDER BY c.created_at DESC,c.id DESC LIMIT $4`, [user, start?.created_at ?? null, start?.id ?? null, q.limit + 1]);
            const page = rows.slice(0, q.limit), items = [];
            for (const c of page) {
                await conversationAccess(db, c.id, user);
                items.push(await readConversation(db, c.id, user));
            }
            const last = page.at(-1);
            return { items, next_cursor: rows.length > q.limit ? this.cursor.encode({ id: last.id, created_at: last.created_at.toISOString() }, scope) : null };
        });
    }
    messages(header: string | undefined, id: string, q: ReturnType<typeof messagesQuery>) {
        return this.readTx(header, async (db, user) => {
            await conversationAccess(db, id, user);
            const scope = `messages:${user}:${id}:${q.after ?? ''}`, start = this.cursor.decode(q.cursor, scope);
            let sequence: number | null = null;
            if (start) {
                const { rows: [m] } = await db.query('SELECT sequence FROM messages WHERE id=$1 AND conversation_id=$2', [start.id, id]);
                if (!m)
                    throw new BadRequestException();
                sequence = Number(m.sequence);
            }
            const { rows } = await db.query<MessageRow>(`SELECT * FROM messages WHERE conversation_id=$1 AND ($2::bigint IS NULL OR sequence>$2) AND ($3::bigint IS NULL OR sequence>$3) ORDER BY sequence LIMIT $4`, [id, q.after ?? null, sequence, q.limit + 1]);
            const page = rows.slice(0, q.limit), last = page.at(-1);
            return { items: page.map(dto), next_cursor: rows.length > q.limit && last ? this.cursor.encode({ id: last.id, created_at: last.created_at.toISOString() }, scope) : null };
        });
    }
    send(header: string | undefined, id: string, input: ReturnType<typeof messageInput>, key: string) {
        return this.tx.run(header, `message.${id}`, key, input, async (db, actor) => {
            // Actor lock serializes this sender's client_message_id even across rooms.
            const { rows: [old] } = await db.query<MessageRow>('SELECT * FROM messages WHERE sender_id=$1 AND client_message_id=$2', [actor.user.id, input.client_message_id]);
            if (old) {
                if (old.conversation_id !== id || old.body !== input.body || old.job_id !== input.job_id)
                    throw new ConflictException({ code: 'IDEMPOTENCY_MISMATCH' });
                return dto(old);
            }
            const { rows: [c] } = await db.query('UPDATE conversations SET next_sequence=next_sequence+1 WHERE id=$1 RETURNING next_sequence-1 AS sequence', [id]);
            const { rows: [m] } = await db.query<MessageRow>('INSERT INTO messages(conversation_id,sequence,sender_id,client_message_id,body,job_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *', [id, c.sequence, actor.user.id, input.client_message_id, input.body, input.job_id]);
            await event(db, `message:${m.id}`, id, Number(m.sequence), 'conversation.message_created.v1', { conversation_id: id, message_id: m.id, sequence: Number(m.sequence) });
            return dto(m);
        }, async (db, actor) => {
            if (input.job_id) {
                await jobAccess(db, input.job_id, actor.user.id);
                if (!(await db.query('SELECT 1 FROM job_conversations WHERE job_id=$1 AND conversation_id=$2', [input.job_id, id])).rowCount)
                    throw new NotFoundException();
            }
            await conversationAccess(db, id, actor.user.id);
        });
    }
    read(header: string | undefined, id: string, sequence: number, key: string) {
        return this.tx.run(header, `read.${id}`, key, { last_sequence: sequence }, async (db, actor) => {
            const { rows: [c] } = await db.query('SELECT next_sequence FROM conversations WHERE id=$1 FOR UPDATE', [id]);
            if (sequence >= Number(c.next_sequence))
                throw new BadRequestException();
            const { rows: [read] } = await db.query('INSERT INTO conversation_reads(conversation_id,user_id,last_sequence) VALUES($1,$2,$3) ON CONFLICT(conversation_id,user_id) DO UPDATE SET last_sequence=GREATEST(conversation_reads.last_sequence,EXCLUDED.last_sequence) RETURNING last_sequence', [id, actor.user.id, sequence]);
            const last = Number(read.last_sequence);
            await event(db, `read:${id}:${actor.user.id}:${last}`, id, Math.max(1, last), 'conversation.read.v1', { conversation_id: id, user_id: actor.user.id, last_sequence: last });
            return { id, version: Math.max(1, last), state: 'read' };
        }, async (db, actor) => { await conversationAccess(db, id, actor.user.id); });
    }
}
