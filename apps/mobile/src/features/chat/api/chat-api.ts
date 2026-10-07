import { requestJson } from '../../../lib/http/request';
import { ApiError } from '../../../lib/http/api-error';
import { record, isPage } from '../../jobs/api/jobs-api';
import type { Page } from '../../jobs/models';
import type { Conversation, Message, MessageInput } from '../models';
const sequence = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
export const isConversation = (v: unknown): v is Conversation => record(v) && typeof v.id === 'string' && ['direct', 'partner'].includes(String(v.kind)) && typeof v.display_name === 'string' && sequence(v.last_sequence) && sequence(v.unread) && Array.isArray(v.job_ids) && v.job_ids.every(x => typeof x === 'string');
export const isMessage = (v: unknown): v is Message => record(v) && ['id', 'conversation_id', 'body'].every(k => typeof v[k] === 'string') && sequence(v.sequence) && Number(v.sequence) > 0 && [v.sender_id, v.asset_id, v.job_id].every(x => x === null || typeof x === 'string') && typeof v.created_at === 'string' && Number.isFinite(Date.parse(v.created_at));
export type ChatApi = {
    open: (token: string, input: {
        partner_id?: string;
        peer_user_id?: string;
    }, key: string) => Promise<Conversation>;
    list: (token: string, cursor?: string) => Promise<Page<Conversation>>;
    messages: (token: string, id: string, after?: number, cursor?: string) => Promise<Page<Message>>;
    send: (token: string, id: string, input: MessageInput, key: string) => Promise<Message>;
    read: (token: string, id: string, last: number, key: string) => Promise<unknown>;
};
export function createChatApi(base: string | undefined, transport: typeof fetch = fetch): ChatApi {
    async function call<T>(path: string, token: string, validate: (v: unknown) => v is T, method: 'GET' | 'POST' | 'PUT' = 'GET', body?: unknown, key?: string): Promise<T> {
        if (!base || !/^https?:\/\//.test(base))
            throw new ApiError('CONFIG');
        return await requestJson(base.replace(/\/$/, '') + '/conversations' + path, transport, undefined, undefined, validate, { ...(method === 'GET' ? { method } : { method, body }), headers: { Authorization: `Bearer ${token}`, ...(key ? { 'Idempotency-Key': key } : {}) } }) as T;
    }
    return { open: (t, b, k) => call('', t, isConversation, 'POST', b, k), list: (t, c) => call(c ? '?cursor=' + encodeURIComponent(c) : '', t, isPage(isConversation)), messages: (t, id, a, c) => { const q = new URLSearchParams(); if (a !== undefined)
            q.set('after_sequence', String(a)); if (c)
            q.set('cursor', c); return call('/' + encodeURIComponent(id) + '/messages?' + q, t, isPage(isMessage)); }, send: (t, id, b, k) => call('/' + encodeURIComponent(id) + '/messages', t, isMessage, 'POST', b, k), read: (t, id, last, k) => call('/' + encodeURIComponent(id) + '/read', t, (v): v is {
            id: string;
            state: string;
        } => record(v) && v.id === id && v.state === 'read', 'PUT', { last_sequence: last }, k) };
}
