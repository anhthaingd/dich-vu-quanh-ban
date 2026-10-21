import { requestJson } from '../../../lib/http/request';
import { ApiError } from '../../../lib/http/api-error';
import { validPoint } from '../../location/models';
import type { Job, JobCreate, JobAction, JobChange, Member, Page } from '../models';
export const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown) => Number.isSafeInteger(v) && Number(v) > 0;
const date = (v: unknown) => v === null || typeof v === 'string' && Number.isFinite(Date.parse(v));
const nullableString = (v: unknown) => v === null || typeof v === 'string';
export function isJob(v: unknown): v is Job {
    return record(v) && ['id', 'customer_id', 'partner_id', 'note'].every(k => typeof v[k] === 'string') && ['requested', 'accepted', 'awaiting_settlement', 'completed', 'declined', 'withdrawn', 'stopped'].includes(String(v.state)) && integer(v.version) && integer(v.schedule_version) && date(v.scheduled_at) && date(v.eta) && ['at_shop', 'at_customer', 'custom'].includes(String(v.service_mode)) && ['now', 'scheduled'].includes(String(v.time_mode)) && nullableString(v.location_id) && nullableString(v.invoice_id) && nullableString(v.assigned_member_id) && record(v.address) && typeof v.address.text === 'string' && validPoint(v.address.point) && Array.isArray(v.skills) && v.skills.every(s => record(s) && typeof s.skill_id === 'string' && integer(s.schema_version)) && Array.isArray(v.allowed_actions) && v.allowed_actions.every(x => ['accept', 'decline', 'withdraw', 'reschedule', 'stop', 'assignments', 'invoice', 'confirm_receipt'].includes(x));
}
export const isPage = <T>(validate: (v: unknown) => v is T) => (v: unknown): v is Page<T> => record(v) && Array.isArray(v.items) && v.items.every(validate) && nullableString(v.next_cursor);
const isMember = (v: unknown): v is Member => record(v) && ['id', 'user_id', 'display_name'].every(k => typeof v[k] === 'string') && typeof v.active === 'boolean' && typeof v.is_owner === 'boolean' && integer(v.version) && Array.isArray(v.permissions) && v.permissions.every(x => typeof x === 'string');
export type JobsApi = {
    create: (token: string, input: JobCreate, key: string) => Promise<Job>;
    get: (token: string, id: string) => Promise<Job>;
    list: (token: string, partner?: string, cursor?: string) => Promise<Page<Job>>;
    change: (token: string, id: string, action: JobAction, input: JobChange, key: string) => Promise<Job>;
    members: (token: string, partner: string, cursor?: string) => Promise<Page<Member>>;
};
export function createJobsApi(base: string | undefined, transport: typeof fetch = fetch): JobsApi {
    async function call<T>(path: string, token: string, validate: (v: unknown) => v is T, method: 'GET' | 'POST' = 'GET', body?: unknown, key?: string): Promise<T> {
        if (!base || !/^https?:\/\//.test(base))
            throw new ApiError('CONFIG');
        return await requestJson(base.replace(/\/$/, '') + path, transport, undefined, undefined, validate, { ...(method === 'GET' ? { method } : { method, body }), headers: { Authorization: `Bearer ${token}`, ...(key ? { 'Idempotency-Key': key } : {}) } }) as T;
    }
    return {
        create: (t, b, k) => call('/jobs', t, isJob, 'POST', b, k), get: (t, id) => call('/jobs/' + encodeURIComponent(id), t, isJob),
        list: (t, p, c) => { const q = new URLSearchParams(); if (p)
            q.set('partner_id', p); if (c)
            q.set('cursor', c); return call('/jobs?' + q, t, isPage(isJob)); },
        change: async (t, id, a, b, k) => { if (a === 'assignments') {
            const r = await call('/jobs/' + encodeURIComponent(id) + '/assignments', t, (v): v is {
                job: Job;
                conversation_id: string;
            } => record(v) && isJob(v.job) && typeof v.conversation_id === 'string', 'POST', b, k);
            return r.job;
        } return call('/jobs/' + encodeURIComponent(id) + '/' + a, t, isJob, 'POST', b, k); },
        members: (t, p, c) => call('/partners/' + encodeURIComponent(p) + '/members' + (c ? '?cursor=' + encodeURIComponent(c) : ''), t, isPage(isMember))
    };
}
