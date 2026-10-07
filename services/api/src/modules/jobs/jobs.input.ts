import { BadRequestException } from '@nestjs/common';
import { identifier, object, pageInput } from '../accounts/accounts.input.js';
import { pointInput, textInput, type Mode } from '../partners/partners.input.js';
export const jobStates = ['requested', 'accepted', 'awaiting_settlement', 'completed', 'declined', 'withdrawn', 'stopped'] as const;
export const versionInput = (v: unknown): number => {
    if (!Number.isSafeInteger(v) || Number(v) < 1)
        throw new BadRequestException();
    return v as number;
};
export function dateInput(v: unknown) {
    if (typeof v !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?(Z|[+-]\d\d:\d\d)$/.test(v) || !Number.isFinite(Date.parse(v)))
        throw new BadRequestException();
    const day = v.slice(0, 10);
    if (new Date(day + 'T00:00:00Z').toISOString().slice(0, 10) !== day)
        throw new BadRequestException();
    return new Date(v).toISOString();
}
export function jobCreateInput(value: unknown) {
    const v = object(value, ['partner_id', 'skills', 'service_mode', 'location_id', 'address', 'time_mode', 'scheduled_at', 'note']);
    if (!['at_shop', 'at_customer', 'custom'].includes(String(v.service_mode)) || !['now', 'scheduled'].includes(String(v.time_mode)) || !Array.isArray(v.skills) || !v.skills.length)
        throw new BadRequestException();
    const a = object(v.address, ['text', 'point']);
    const skills = v.skills.map(value => {
        const s = object(value, ['skill_id', 'schema_version', 'answers']);
        if (s.answers !== undefined && (!s.answers || typeof s.answers !== 'object' || Array.isArray(s.answers)))
            throw new BadRequestException();
        return { skill_id: identifier(s.skill_id), schema_version: versionInput(s.schema_version), answers: (s.answers ?? {}) as Record<string, unknown> };
    });
    if (new Set(skills.map(s => s.skill_id)).size !== skills.length)
        throw new BadRequestException();
    const scheduled_at = v.scheduled_at === undefined ? null : dateInput(v.scheduled_at);
    const location_id = v.location_id === undefined ? null : identifier(v.location_id);
    if ((v.time_mode === 'scheduled' && !scheduled_at) || (v.time_mode === 'now' && scheduled_at) || (v.service_mode === 'at_shop' ? !location_id : !!location_id))
        throw new BadRequestException();
    return { partner_id: identifier(v.partner_id), skills, service_mode: v.service_mode as Mode, location_id, address: { text: textInput(a.text), point: pointInput(a.point) }, time_mode: v.time_mode as 'now' | 'scheduled', scheduled_at, note: v.note === undefined ? '' : textInput(v.note, true, true) };
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
        throw new BadRequestException();
    const v = object(value, ['expected_version', ...fields]);
    const r: JobChange = { expected_version: versionInput(v.expected_version) };
    if (action === 'accept' && v.eta !== undefined)
        r.eta = dateInput(v.eta);
    if (['decline', 'withdraw', 'stop'].includes(action))
        r.reason = textInput(v.reason);
    if (action === 'reschedule') {
        r.scheduled_at = dateInput(v.scheduled_at);
        r.reason = v.reason === undefined ? '' : textInput(v.reason, true, true);
    }
    if (action === 'stop') {
        if (typeof v.has_agreed_charges !== 'boolean')
            throw new BadRequestException();
        r.has_agreed_charges = v.has_agreed_charges;
    }
    if (action === 'assignments')
        r.membership_id = identifier(v.membership_id);
    return r;
}
export function jobsQuery(q: Record<string, unknown>) {
    object(q, ['partner_id', 'state', 'cursor', 'limit']);
    if (q.state !== undefined && !jobStates.includes(q.state as typeof jobStates[number]))
        throw new BadRequestException();
    return { ...pageInput({ ...(q.limit === undefined ? {} : { limit: q.limit }), ...(q.cursor === undefined ? {} : { cursor: q.cursor }) }), partner_id: q.partner_id === undefined ? undefined : identifier(q.partner_id), state: q.state as string | undefined };
}
