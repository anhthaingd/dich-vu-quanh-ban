import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Ajv } from 'ajv';
import type { Pool, PoolClient } from 'pg';
import type { AuthService } from '../auth/auth.service.js';
import { AccountTransaction } from '../accounts/account-transaction.js';
import type { PageInput } from '../accounts/accounts.input.js';
import type { Cursor } from '../../common/http/cursor.js';
import { visibleSkills } from '../partners/partners.read.js';
import { allowedActions, jobAccess, memberAccess, hasPermission, type JobAccess } from './jobs.access.js';
import type { JobCreate, JobAction, JobChange, jobsQuery } from './jobs.input.js';
import { directConversation, event, partnerConversation, systemMessage } from '../chat/chat.store.js';
const iso = (v: Date | null) => v?.toISOString() ?? null;
export class JobsService {
    private readonly tx: AccountTransaction;
    private readonly schemas = new Ajv({ strict: false, allErrors: false, validateFormats: false });
    constructor(private readonly pool: Pool, private readonly auth: AuthService, private readonly cursor: Cursor) { this.tx = new AccountTransaction(pool, auth); }
    private async read(db: PoolClient, a: JobAccess) {
        const j = a.job;
        const skills = (await db.query('SELECT skill_id,schema_version,answers FROM job_skills WHERE job_id=$1 ORDER BY created_at,id', [j.id])).rows;
        return { id: j.id, customer_id: j.customer_id, partner_id: j.partner_id, state: j.state, version: j.version, schedule_version: j.schedule_version, scheduled_at: iso(j.scheduled_at), skills, address: j.address_snapshot, assigned_member_id: a.assigned_member_id, invoice_id: null, allowed_actions: allowedActions(a), service_mode: j.service_mode, time_mode: j.time_mode, location_id: j.location_id, note: j.note, eta: iso(j.eta) };
    }
    private async eligible(db: PoolClient, input: JobCreate, customer: string, accepting = true) {
        const { rows: [p] } = await db.query('SELECT * FROM partners WHERE id=$1 AND archived_at IS NULL FOR UPDATE', [input.partner_id]);
        if (!p)
            throw new NotFoundException();
        if (p.publication_status !== 'published' || p.moderation_status !== 'active' || (accepting && !p.accepting_jobs))
            throw new ConflictException({ code: 'STATE_CONFLICT' });
        if (await memberAccess(db, input.partner_id, customer))
            throw new ForbiddenException();
        for (const skill of input.skills) {
            const { rows: [s] } = await db.query(`${visibleSkills} SELECT s.name_vi,s.schema_version,s.form_schema FROM visible_skills s JOIN partner_skills ps ON ps.skill_id=s.id WHERE ps.partner_id=$1 AND ps.active AND s.id=$2 AND $3=ANY(ps.modes)`, [input.partner_id, skill.skill_id, input.service_mode]);
            if (!s || s.schema_version !== skill.schema_version)
                throw new ConflictException({ code: 'STATE_CONFLICT' });
            let valid = false;
            try {
                valid = this.schemas.validate(s.form_schema, skill.answers);
            }
            catch {
                throw new BadRequestException();
            }
            if (!valid)
                throw new BadRequestException();
        }
        if (input.service_mode === 'at_shop') {
            const { rows: [l] } = await db.query(`SELECT address_text AS text,json_build_object('latitude',ST_Y(point::geometry),'longitude',ST_X(point::geometry)) AS point FROM partner_locations WHERE id=$1 AND partner_id=$2 AND active AND public`, [input.location_id, input.partner_id]);
            if (!l)
                throw new ConflictException({ code: 'STATE_CONFLICT' });
            return l as JobCreate['address'];
        }
        const { rows: [area] } = await db.query(`SELECT 1 FROM service_areas WHERE partner_id=$1 AND active AND ((center IS NOT NULL AND ST_DWithin(center,ST_SetSRID(ST_MakePoint($2,$3),4326)::geography,radius_m)) OR (boundary IS NOT NULL AND ST_Covers(boundary::geometry,ST_SetSRID(ST_MakePoint($2,$3),4326)))) LIMIT 1`, [input.partner_id, input.address.point.longitude, input.address.point.latitude]);
        if (!area)
            throw new ConflictException({ code: 'STATE_CONFLICT' });
        return input.address;
    }
    create(header: string | undefined, input: JobCreate, key: string) {
        return this.tx.run(header, 'createJob', key, input, async (db, actor) => {
            if (input.scheduled_at && Date.parse(input.scheduled_at) <= Date.now())
                throw new BadRequestException();
            const address = await this.eligible(db, input, actor.user.id);
            const { rows: [j] } = await db.query(`INSERT INTO jobs(customer_id,partner_id,service_mode,location_id,address_snapshot,point,time_mode,scheduled_at,note) VALUES($1,$2,$3,$4,$5,ST_SetSRID(ST_MakePoint($6,$7),4326)::geography,$8,$9,$10) RETURNING id`, [actor.user.id, input.partner_id, input.service_mode, input.location_id, JSON.stringify(address), address.point.longitude, address.point.latitude, input.time_mode, input.scheduled_at, input.note]);
            for (const s of input.skills)
                await db.query(`INSERT INTO job_skills(job_id,skill_id,name_snapshot,schema_version,answers) SELECT $1,id,name_vi,$3,$4 FROM skills WHERE id=$2`, [j.id, s.skill_id, s.schema_version, JSON.stringify(s.answers)]);
            const conversation = await partnerConversation(db, input.partner_id, actor.user.id);
            await db.query('INSERT INTO job_conversations(job_id,conversation_id) VALUES($1,$2)', [j.id, conversation]);
            return this.read(db, await jobAccess(db, j.id, actor.user.id));
        }, async (db, actor) => {
            if (!actor.user.phone_verified)
                throw new ForbiddenException();
            const { rows: [old] } = await db.query("SELECT response_snapshot->>'id' AS id FROM idempotency_keys WHERE actor_id=$1 AND operation='createJob' AND request_key=$2", [actor.user.id, key]);
            if (old)
                await jobAccess(db, old.id, actor.user.id);
        });
    }
    async get(header: string | undefined, id: string) { return this.readTx(header, (db, user) => jobAccess(db, id, user).then(a => this.read(db, a))); }
    members(header: string | undefined, id: string, q: PageInput) {
        return this.readTx(header, async (db, user) => {
            await db.query('SELECT id FROM partners WHERE id=$1 FOR SHARE', [id]);
            const m = await memberAccess(db, id, user);
            if (!m)
                throw new NotFoundException();
            if (!hasPermission(m, 'members.manage') && !hasPermission(m, 'jobs.assign'))
                throw new ForbiddenException();
            const scope = `members:${id}:${user}`, start = this.cursor.decode(q.cursor, scope);
            const { rows } = await db.query(`SELECT m.id,m.user_id,u.display_name,m.active,m.is_owner,m.version,m.created_at,ARRAY(SELECT permission FROM membership_grants g WHERE g.membership_id=m.id AND g.revoked_at IS NULL) AS permissions FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.partner_id=$1 AND ($2::timestamptz IS NULL OR (m.created_at,m.id)>($2::timestamptz,$3::uuid)) ORDER BY m.created_at,m.id LIMIT $4`, [id, start?.created_at ?? null, start?.id ?? null, q.limit + 1]);
            const page = rows.slice(0, q.limit), last = page.at(-1);
            return { items: page.map(({ created_at, ...m }) => { void created_at; return m; }), next_cursor: rows.length > q.limit ? this.cursor.encode({ id: last.id, created_at: last.created_at.toISOString() }, scope) : null };
        });
    }
    private async readTx<T>(header: string | undefined, work: (db: PoolClient, user: string) => Promise<T>) {
        const db = await this.pool.connect();
        try {
            await db.query('BEGIN');
            const actor = await this.auth.authenticate(header, db);
            const result = await work(db, actor.user.id);
            await db.query('COMMIT');
            return result;
        }
        catch (e) {
            await db.query('ROLLBACK');
            throw e;
        }
        finally {
            db.release();
        }
    }
    async list(header: string | undefined, q: ReturnType<typeof jobsQuery>) {
        return this.readTx(header, async (db, user) => {
            const scope = JSON.stringify(['jobs', user, q.partner_id, q.state]);
            const start = this.cursor.decode(q.cursor, scope);
            let member: Awaited<ReturnType<typeof memberAccess>>;
            if (q.partner_id) {
                await db.query('SELECT id FROM partners WHERE id=$1 FOR UPDATE', [q.partner_id]);
                member = await memberAccess(db, q.partner_id, user);
                if (!member)
                    throw new NotFoundException();
            }
            const full = hasPermission(member, 'jobs.manage') || hasPermission(member, 'jobs.accept') || hasPermission(member, 'jobs.assign');
            const { rows } = await db.query(`SELECT id,created_at FROM jobs j WHERE ($1::uuid IS NULL AND customer_id=$2 OR partner_id=$1 AND ($3 OR EXISTS(SELECT 1 FROM assignments a WHERE a.job_id=j.id AND a.membership_id=$4 AND a.ended_at IS NULL))) AND ($5::text IS NULL OR state=$5) AND ($6::timestamptz IS NULL OR (created_at,id)<($6::timestamptz,$7::uuid)) ORDER BY created_at DESC,id DESC LIMIT $8`, [q.partner_id ?? null, user, full, member?.id ?? null, q.state ?? null, start?.created_at ?? null, start?.id ?? null, q.limit + 1]);
            const page = rows.slice(0, q.limit), items = [];
            for (const j of page)
                items.push(await this.read(db, await jobAccess(db, j.id, user)));
            const last = page.at(-1);
            return { items, next_cursor: rows.length > q.limit ? this.cursor.encode({ id: last.id, created_at: last.created_at.toISOString() }, scope) : null };
        });
    }
    change(header: string | undefined, id: string, action: JobAction, input: JobChange, key: string) {
        return this.tx.run(header, `job.${id}.${action}`, key, input, async (db, actor) => {
            const a = await jobAccess(db, id, actor.user.id), j = a.job;
            if (j.version !== input.expected_version)
                throw new ConflictException({ code: 'VERSION_CONFLICT' });
            if (!allowedActions(a).includes(action))
                throw new ConflictException({ code: 'STATE_CONFLICT' });
            if (action === 'accept') {
                if (j.time_mode === 'now' && (!input.eta || Date.parse(input.eta) <= Date.now()))
                    throw new BadRequestException();
                const dto = await this.read(db, a);
                await this.eligible(db, { ...dto, scheduled_at: dto.scheduled_at, skills: dto.skills } as JobCreate, j.customer_id, false);
                await db.query("UPDATE jobs SET state='accepted',accepted_at=now(),eta=$2,scheduled_at=CASE WHEN time_mode='now' THEN $2 ELSE scheduled_at END WHERE id=$1", [id, j.time_mode === 'now' ? input.eta : null]);
                const { rows: [p] } = await db.query('SELECT kind FROM partners WHERE id=$1', [j.partner_id]);
                if (p.kind === 'solo')
                    await db.query('INSERT INTO assignments(job_id,partner_id,membership_id,assigned_by) VALUES($1,$2,$3,$4)', [id, j.partner_id, a.member!.id, actor.user.id]);
            }
            else if (action === 'decline' || action === 'withdraw')
                await db.query('UPDATE jobs SET state=$2,stop_reason=$3 WHERE id=$1', [id, action === 'decline' ? 'declined' : 'withdrawn', input.reason]);
            else if (action === 'reschedule') {
                if (Date.parse(input.scheduled_at!) <= Date.now())
                    throw new BadRequestException();
                await db.query('INSERT INTO schedule_history(job_id,actor_id,version,old_at,new_at,reason) VALUES($1,$2,$3,$4,$5,$6)', [id, actor.user.id, j.schedule_version + 1, j.scheduled_at, input.scheduled_at, input.reason]);
                await db.query('UPDATE jobs SET scheduled_at=$2,schedule_version=schedule_version+1 WHERE id=$1', [id, input.scheduled_at]);
            }
            else if (action === 'stop')
                await db.query("UPDATE jobs SET state=CASE WHEN $2 THEN 'accepted' ELSE 'stopped' END,stop_has_agreed_charges=$2,stop_reason=$3 WHERE id=$1", [id, input.has_agreed_charges, input.reason]);
            else if (action === 'assignments') {
                const { rows: [m] } = await db.query("SELECT m.* FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.id=$1 AND m.partner_id=$2 AND m.active AND u.status='active' FOR SHARE OF m", [input.membership_id, j.partner_id]);
                if (!m || m.user_id === j.customer_id)
                    throw new BadRequestException();
                await db.query('UPDATE assignments SET ended_at=now() WHERE job_id=$1 AND ended_at IS NULL', [id]);
                const { rows: [assigned] } = await db.query('INSERT INTO assignments(job_id,partner_id,membership_id,assigned_by) VALUES($1,$2,$3,$4) RETURNING id', [id, j.partner_id, m.id, actor.user.id]);
                const conversation = await directConversation(db, j.customer_id, m.user_id);
                await db.query('INSERT INTO job_conversations(job_id,conversation_id,assignment_id) VALUES($1,$2,$3) ON CONFLICT(job_id,conversation_id) DO UPDATE SET assignment_id=EXCLUDED.assignment_id', [id, conversation, assigned.id]);
                await systemMessage(db, conversation, id, `assignment:${assigned.id}`, 'Đã phân công người thực hiện.');
                await event(db, `job:${id}:${j.version + 1}`, id, j.version + 1, 'job.assigned.v1', { job_id: id, job_version: j.version + 1, assignment_id: assigned.id, conversation_id: conversation });
                await db.query('UPDATE jobs SET version=version+1 WHERE id=$1', [id]);
                return { job: await this.read(db, await jobAccess(db, id, actor.user.id)), conversation_id: conversation };
            }
            await db.query('UPDATE jobs SET version=version+1 WHERE id=$1', [id]);
            const conversation = await partnerConversation(db, j.partner_id, j.customer_id);
            const key = `job:${id}:${j.version + 1}:${action}`;
            if (action === 'accept') {
                await systemMessage(db, conversation, id, key, 'Đã nhận yêu cầu dịch vụ.');
                await event(db, key + ':accepted', id, j.version + 1, 'job.accepted.v1', { job_id: id, job_version: j.version + 1, conversation_id: conversation });
            }
            if (action === 'reschedule')
                await event(db, key, id, j.version + 1, 'job.schedule_changed.v1', { job_id: id, schedule_version: j.schedule_version + 1, scheduled_at: input.scheduled_at });
            return this.read(db, await jobAccess(db, id, actor.user.id));
        }, async (db, actor) => {
            if (action === 'accept' && !actor.user.phone_verified)
                throw new ForbiddenException();
            const a = await jobAccess(db, id, actor.user.id);
            const permitted = action === 'withdraw' ? a.customer : ['accept', 'decline'].includes(action) ? a.accepts : action === 'assignments' ? a.assigns : a.customer || a.manages || a.assigned;
            if (!permitted)
                throw new ForbiddenException();
        });
    }
}
