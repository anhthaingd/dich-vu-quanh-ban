import type { Mode, Point } from '../partners/models';
export type JobState = 'requested' | 'accepted' | 'awaiting_settlement' | 'completed' | 'declined' | 'withdrawn' | 'stopped';
export type JobSkill = {
    skill_id: string;
    schema_version: number;
    answers?: Record<string, unknown>;
};
export type JobCreate = {
    partner_id: string;
    skills: JobSkill[];
    service_mode: Mode;
    location_id?: string;
    address: {
        text: string;
        point: Point;
    };
    time_mode: 'now' | 'scheduled';
    scheduled_at?: string;
    note?: string;
};
export type Job = {
    id: string;
    customer_id: string;
    partner_id: string;
    state: JobState;
    version: number;
    schedule_version: number;
    scheduled_at: string | null;
    skills: JobSkill[];
    address: JobCreate['address'];
    assigned_member_id: string | null;
    invoice_id: string | null;
    allowed_actions: (JobAction | 'invoice')[];
    service_mode: Mode;
    time_mode: 'now' | 'scheduled';
    location_id: string | null;
    note: string;
    eta: string | null;
};
export type JobAction = 'accept' | 'decline' | 'withdraw' | 'reschedule' | 'stop' | 'assignments';
export type JobChange = {
    expected_version: number;
    eta?: string;
    reason?: string;
    scheduled_at?: string;
    has_agreed_charges?: boolean;
    membership_id?: string;
};
export type Member = {
    id: string;
    user_id: string;
    display_name: string;
    active: boolean;
    is_owner: boolean;
    permissions: string[];
    version: number;
};
export type Page<T> = {
    items: T[];
    next_cursor: string | null;
};
