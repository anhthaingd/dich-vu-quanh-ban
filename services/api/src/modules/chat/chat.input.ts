import { BadRequestException } from '@nestjs/common';
import { identifier, object, pageInput } from '../accounts/accounts.input.js';
import { textInput } from '../partners/partners.input.js';
// Body ids name the field at fault; the shared helper only knows the value.
export function bodyId(value: unknown, field: string) {
    try { return identifier(value); }
    catch { throw new BadRequestException({ reason: 'ID_INVALID', field }); }
}
// Idempotency-Key header (UUID) is required on every write in these modules.
export function idempotencyKey(value: unknown) {
    try { return identifier(value); }
    catch { throw new BadRequestException({ reason: 'IDEMPOTENCY_KEY_REQUIRED' }); }
}
export function conversationInput(value: unknown) {
    const v = object(value, ['peer_user_id', 'partner_id']);
    if ((v.peer_user_id === undefined) === (v.partner_id === undefined))
        throw new BadRequestException({ reason: 'CHAT_TARGET_REQUIRED' });
    return v.partner_id === undefined ? { peer_user_id: bodyId(v.peer_user_id, 'peer_user_id') } : { partner_id: bodyId(v.partner_id, 'partner_id') };
}
function messageBody(v: unknown) {
    if (typeof v !== 'string' || !v.trim())
        throw new BadRequestException({ reason: 'CHAT_MESSAGE_EMPTY', field: 'body' });
    try { return textInput(v, false, true); }
    catch { throw new BadRequestException({ reason: 'CHAT_MESSAGE_INVALID_CHARACTERS', field: 'body' }); }
}
export function messageInput(value: unknown) {
    const v = object(value, ['client_message_id', 'body', 'asset_id', 'job_id']);
    // Attachments belong to the asset delivery; a UUID alone cannot certify an upload.
    if (v.asset_id !== undefined)
        throw new BadRequestException({ reason: 'CHAT_ATTACHMENT_UNSUPPORTED', field: 'asset_id' });
    const client_message_id = bodyId(v.client_message_id, 'client_message_id');
    return { client_message_id, body: messageBody(v.body), job_id: v.job_id === undefined ? null : bodyId(v.job_id, 'job_id') };
}
export function readInput(value: unknown) { const v = object(value, ['last_sequence']); if (!Number.isSafeInteger(v.last_sequence) || Number(v.last_sequence) < 0)
    throw new BadRequestException({ reason: 'CHAT_READ_SEQUENCE_INVALID', field: 'last_sequence' }); return v.last_sequence as number; }
export function messagesQuery(q: Record<string, unknown>) {
    object(q, ['cursor', 'limit', 'after_sequence']);
    if (q.after_sequence !== undefined && (typeof q.after_sequence !== 'string' || !/^\d+$/.test(q.after_sequence) || !Number.isSafeInteger(+q.after_sequence)))
        throw new BadRequestException({ reason: 'CHAT_AFTER_SEQUENCE_INVALID', field: 'after_sequence' });
    return { ...pageInput({ ...(q.limit === undefined ? {} : { limit: q.limit }), ...(q.cursor === undefined ? {} : { cursor: q.cursor }) }), after: q.after_sequence === undefined ? undefined : Number(q.after_sequence) };
}
