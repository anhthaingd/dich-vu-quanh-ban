import { BadRequestException } from '@nestjs/common';
import { identifier, object, pageInput } from '../accounts/accounts.input.js';
import { textInput } from '../partners/partners.input.js';
export function conversationInput(value: unknown) {
    const v = object(value, ['peer_user_id', 'partner_id']);
    if ((v.peer_user_id === undefined) === (v.partner_id === undefined))
        throw new BadRequestException();
    return v.partner_id === undefined ? { peer_user_id: identifier(v.peer_user_id) } : { partner_id: identifier(v.partner_id) };
}
export function messageInput(value: unknown) {
    const v = object(value, ['client_message_id', 'body', 'asset_id', 'job_id']);
    // Attachments belong to the asset delivery; a UUID alone cannot certify an upload.
    if (v.asset_id !== undefined)
        throw new BadRequestException();
    return { client_message_id: identifier(v.client_message_id), body: textInput(v.body, false, true), job_id: v.job_id === undefined ? null : identifier(v.job_id) };
}
export function readInput(value: unknown) { const v = object(value, ['last_sequence']); if (!Number.isSafeInteger(v.last_sequence) || Number(v.last_sequence) < 0)
    throw new BadRequestException(); return v.last_sequence as number; }
export function messagesQuery(q: Record<string, unknown>) {
    object(q, ['cursor', 'limit', 'after_sequence']);
    if (q.after_sequence !== undefined && (typeof q.after_sequence !== 'string' || !/^\d+$/.test(q.after_sequence) || !Number.isSafeInteger(+q.after_sequence)))
        throw new BadRequestException();
    return { ...pageInput({ ...(q.limit === undefined ? {} : { limit: q.limit }), ...(q.cursor === undefined ? {} : { cursor: q.cursor }) }), after: q.after_sequence === undefined ? undefined : Number(q.after_sequence) };
}
