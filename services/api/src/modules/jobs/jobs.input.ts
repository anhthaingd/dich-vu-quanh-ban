import { BadRequestException } from '@nestjs/common';
import { identifier, object, pageInput } from '../accounts/accounts.input.js';
import { pointInput, textInput, type Mode } from '../partners/partners.input.js';
export const jobStates = ['requested', 'accepted', 'awaiting_settlement', 'completed', 'declined', 'withdrawn', 'stopped'] as const;
// Error causes are static strings: never echo the rejected value.
export function invalid(reason: string, field?: string): BadRequestException {
    return new BadRequestException({ reason, ...(field ? { field } : {}) });
}
// Shared parsers throw a bare 400; name the exact field without changing the rule.
export function withReason<T>(reason: string, field: string | undefined, read: () => T): T {
    try {
        return read();
    }
    catch (e) {
        if (e instanceof BadRequestException)
            throw invalid(reason, field);
        throw e;
    }
}
export const pathId = (v: unknown) => withReason('ID_INVALID', 'id', () => identifier(v));
export const idempotencyKey = (v: unknown) => withReason('IDEMPOTENCY_KEY_REQUIRED', undefined, () => identifier(v));
export const versionInput = (v: unknown, reason = 'EXPECTED_VERSION_REQUIRED', field = 'expected_version'): number => {
    if (!Number.isSafeInteger(v) || Number(v) < 1)
        throw invalid(reason, field);
    return v as number;
};
export function dateInput(v: unknown, reason = 'JOB_SCHEDULED_AT_INVALID', field = 'scheduled_at') {
    if (typeof v !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?(Z|[+-]\d\d:\d\d)$/.test(v) || !Number.isFinite(Date.parse(v)))
        throw invalid(reason, field);
    const day = v.slice(0, 10);
    if (new Date(day + 'T00:00:00Z').toISOString().slice(0, 10) !== day)
        throw invalid(reason, field);
    return new Date(v).toISOString();
}
export function jobCreateInput(value: unknown) {
    const v = object(value, ['partner_id', 'skills', 'service_mode', 'location_id', 'address', 'time_mode', 'scheduled_at', 'note']);
    if (!['at_shop', 'at_customer', 'custom'].includes(String(v.service_mode)))
        throw invalid('JOB_SERVICE_MODE_INVALID', 'service_mode');
    if (!['now', 'scheduled'].includes(String(v.time_mode)))
        throw invalid('JOB_TIME_MODE_INVALID', 'time_mode');
    if (!Array.isArray(v.skills) || !v.skills.length)
        throw invalid('JOB_SKILLS_REQUIRED', 'skills');
    const a = withReason('JOB_ADDRESS_INVALID', 'address', () => object(v.address, ['text', 'point']));
    const skills = v.skills.map(value => {
        const s = withReason('JOB_SKILL_INVALID', 'skills', () => object(value, ['skill_id', 'schema_version', 'answers']));
        if (s.answers !== undefined && (!s.answers || typeof s.answers !== 'object' || Array.isArray(s.answers)))
            throw invalid('JOB_SKILL_ANSWERS_INVALID', 'skills.answers');
        return { skill_id: withReason('JOB_SKILL_INVALID', 'skills.skill_id', () => identifier(s.skill_id)), schema_version: versionInput(s.schema_version, 'JOB_SKILL_INVALID', 'skills.schema_version'), answers: (s.answers ?? {}) as Record<string, unknown> };
    });
    if (new Set(skills.map(s => s.skill_id)).size !== skills.length)
        throw invalid('JOB_SKILL_DUPLICATE', 'skills');
    const scheduled_at = v.scheduled_at === undefined ? null : dateInput(v.scheduled_at);
    const location_id = v.location_id === undefined ? null : withReason('JOB_LOCATION_INVALID', 'location_id', () => identifier(v.location_id));
    if (v.time_mode === 'scheduled' && !scheduled_at)
        throw invalid('JOB_SCHEDULED_AT_REQUIRED', 'scheduled_at');
    if (v.time_mode === 'now' && scheduled_at)
        throw invalid('JOB_SCHEDULED_AT_NOT_ALLOWED', 'scheduled_at');
    if (v.service_mode === 'at_shop' ? !location_id : !!location_id)
        throw invalid(location_id ? 'JOB_LOCATION_NOT_ALLOWED' : 'JOB_LOCATION_REQUIRED', 'location_id');
    return { partner_id: withReason('JOB_PARTNER_INVALID', 'partner_id', () => identifier(v.partner_id)), skills, service_mode: v.service_mode as Mode, location_id, address: { text: withReason('JOB_ADDRESS_TEXT_INVALID', 'address.text', () => textInput(a.text)), point: withReason('JOB_ADDRESS_POINT_INVALID', 'address.point', () => pointInput(a.point)) }, time_mode: v.time_mode as 'now' | 'scheduled', scheduled_at, note: v.note === undefined ? '' : withReason('JOB_NOTE_INVALID', 'note', () => textInput(v.note, true, true)) };
}
export type JobCreate = ReturnType<typeof jobCreateInput>;
export type JobAction = 'accept' | 'decline' | 'withdraw' | 'reschedule' | 'stop' | 'assignments';
export type JobChange = {
    expected_version: number;
    eta?: string;
    reason?: string;
    scheduled_at?: string;
    has_agreed_charges?: boolean;
    membership_id?: string;
};
export function jobChangeInput(action: JobAction, value: unknown): JobChange {
    const fields = { accept: ['eta'], decline: ['reason'], withdraw: ['reason'], reschedule: ['scheduled_at', 'reason'], stop: ['has_agreed_charges', 'reason'], assignments: ['membership_id'] }[action];
    if (!fields)
        throw invalid('JOB_ACTION_INVALID', 'action');
    const v = object(value, ['expected_version', ...fields]);
    const r: JobChange = { expected_version: versionInput(v.expected_version) };
    if (action === 'accept' && v.eta !== undefined)
        r.eta = dateInput(v.eta, 'JOB_ETA_INVALID', 'eta');
    if (['decline', 'withdraw', 'stop'].includes(action))
        r.reason = withReason('JOB_REASON_REQUIRED', 'reason', () => textInput(v.reason));
    if (action === 'reschedule') {
        r.scheduled_at = dateInput(v.scheduled_at);
        r.reason = v.reason === undefined ? '' : withReason('JOB_REASON_INVALID', 'reason', () => textInput(v.reason, true, true));
    }
    if (action === 'stop') {
        if (typeof v.has_agreed_charges !== 'boolean')
            throw invalid('JOB_AGREED_CHARGES_REQUIRED', 'has_agreed_charges');
        r.has_agreed_charges = v.has_agreed_charges;
    }
    if (action === 'assignments')
        r.membership_id = withReason('JOB_ASSIGNEE_REQUIRED', 'membership_id', () => identifier(v.membership_id));
    return r;
}
export function jobsQuery(q: Record<string, unknown>) {
    object(q, ['partner_id', 'state', 'cursor', 'limit']);
    if (q.state !== undefined && !jobStates.includes(q.state as typeof jobStates[number]))
        throw invalid('JOB_STATE_FILTER_INVALID', 'state');
    return { ...pageInput({ ...(q.limit === undefined ? {} : { limit: q.limit }), ...(q.cursor === undefined ? {} : { cursor: q.cursor }) }), partner_id: q.partner_id === undefined ? undefined : withReason('JOB_PARTNER_INVALID', 'partner_id', () => identifier(q.partner_id)), state: q.state as string | undefined };
}
