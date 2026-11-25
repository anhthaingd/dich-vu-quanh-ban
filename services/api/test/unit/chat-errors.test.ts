import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { ConflictException, HttpException, ServiceUnavailableException } from '@nestjs/common';
import { describeException } from '../../src/common/http/http-exception.filter.js';
import { conversationInput, idempotencyKey, messageInput, messagesQuery, readInput } from '../../src/modules/chat/chat.input.js';
import { callChange, callCreate, callsQuery } from '../../src/modules/calls/calls.input.js';
import { reportInput, reportReply } from '../../src/modules/support/support.input.js';
import { deviceInput, settingsInput } from '../../src/modules/notifications/notifications.service.js';

// Each input rule names its exact cause (reason) and, when one exists, the field at fault.
function rejects(work: () => unknown, status: number, reason: string, field?: string) {
  try { work(); } catch (e) {
    assert.ok(e instanceof HttpException);
    assert.equal(e.getStatus(), status);
    const body = e.getResponse() as { reason?: string; field?: string };
    assert.equal(body.reason, reason);
    assert.equal(body.field, field);
    return;
  }
  assert.fail('expected ' + reason);
}
const id = () => randomUUID();

test('chat inputs report the exact cause and field', () => {
  rejects(() => idempotencyKey(undefined), 400, 'IDEMPOTENCY_KEY_REQUIRED');
  rejects(() => idempotencyKey('not-a-uuid'), 400, 'IDEMPOTENCY_KEY_REQUIRED');
  assert.equal(idempotencyKey(id().toUpperCase()).length, 36);
  rejects(() => conversationInput({}), 400, 'CHAT_TARGET_REQUIRED');
  rejects(() => conversationInput({ peer_user_id: id(), partner_id: id() }), 400, 'CHAT_TARGET_REQUIRED');
  rejects(() => conversationInput({ partner_id: 'x' }), 400, 'ID_INVALID', 'partner_id');
  rejects(() => conversationInput({ peer_user_id: 7 }), 400, 'ID_INVALID', 'peer_user_id');
  rejects(() => messageInput({ client_message_id: id(), body: 'hi', asset_id: id() }), 400, 'CHAT_ATTACHMENT_UNSUPPORTED', 'asset_id');
  rejects(() => messageInput({ client_message_id: 'x', body: 'hi' }), 400, 'ID_INVALID', 'client_message_id');
  rejects(() => messageInput({ client_message_id: id(), body: '   ' }), 400, 'CHAT_MESSAGE_EMPTY', 'body');
  rejects(() => messageInput({ client_message_id: id() }), 400, 'CHAT_MESSAGE_EMPTY', 'body');
  rejects(() => messageInput({ client_message_id: id(), body: 'a\u0007b' }), 400, 'CHAT_MESSAGE_INVALID_CHARACTERS', 'body');
  rejects(() => messageInput({ client_message_id: id(), body: 'ok', job_id: 'x' }), 400, 'ID_INVALID', 'job_id');
  assert.deepEqual(messageInput({ client_message_id: '00000000-0000-4000-8000-000000000001', body: ' line\nnext ' }), { client_message_id: '00000000-0000-4000-8000-000000000001', body: 'line\nnext', job_id: null });
  rejects(() => readInput({ last_sequence: -1 }), 400, 'CHAT_READ_SEQUENCE_INVALID', 'last_sequence');
  rejects(() => readInput({ last_sequence: '3' }), 400, 'CHAT_READ_SEQUENCE_INVALID', 'last_sequence');
  rejects(() => messagesQuery({ after_sequence: '-1' }), 400, 'CHAT_AFTER_SEQUENCE_INVALID', 'after_sequence');
  assert.equal(messagesQuery({ after_sequence: '4' }).after, 4);
});

test('call inputs report the exact cause and field', () => {
  rejects(() => callCreate({ job_id: id() }), 400, 'CALL_RECIPIENT_REQUIRED');
  rejects(() => callCreate({ job_id: id(), target: 'worker', recipient_id: id() }), 400, 'CALL_RECIPIENT_REQUIRED');
  rejects(() => callCreate({ job_id: id(), target: 'admin' }), 400, 'CALL_TARGET_INVALID', 'target');
  rejects(() => callCreate({ job_id: 'x', target: 'worker' }), 400, 'ID_INVALID', 'job_id');
  rejects(() => callCreate({ job_id: id(), recipient_id: 'x' }), 400, 'ID_INVALID', 'recipient_id');
  rejects(() => callChange({ expected_version: 0 }), 400, 'EXPECTED_VERSION_REQUIRED', 'expected_version');
  rejects(() => callsQuery({ active: 'false' }), 400, 'CALL_ACTIVE_FILTER_INVALID', 'active');
  rejects(() => callsQuery({ conversation_id: 'x' }), 400, 'ID_INVALID', 'conversation_id');
});

test('support inputs report the exact cause and field', () => {
  const base = { kind: 'account', subject: 'S', body: 'B' };
  rejects(() => reportInput({ ...base, kind: 'other' }), 400, 'SUPPORT_KIND_INVALID', 'kind');
  rejects(() => reportInput({ ...base, subject: ' ' }), 400, 'SUPPORT_SUBJECT_REQUIRED', 'subject');
  rejects(() => reportInput({ ...base, body: '' }), 400, 'SUPPORT_BODY_REQUIRED', 'body');
  rejects(() => reportInput({ ...base, evidence_ids: 'x' }), 400, 'SUPPORT_EVIDENCE_INVALID', 'evidence_ids');
  rejects(() => reportInput({ ...base, evidence_ids: ['x'] }), 400, 'ID_INVALID', 'evidence_ids');
  const e = id();
  rejects(() => reportInput({ ...base, evidence_ids: [e, e] }), 400, 'SUPPORT_EVIDENCE_DUPLICATE', 'evidence_ids');
  rejects(() => reportInput({ ...base, job_id: 'x' }), 400, 'ID_INVALID', 'job_id');
  rejects(() => reportInput({ ...base, kind: 'invoice' }), 400, 'SUPPORT_INVOICE_LINK_INVALID', 'invoice_id');
  rejects(() => reportInput({ ...base, invoice_id: id(), invoice_version_id: id() }), 400, 'SUPPORT_INVOICE_LINK_INVALID', 'invoice_id');
  rejects(() => reportInput({ ...base, kind: 'invoice', invoice_id: id() }), 400, 'SUPPORT_INVOICE_VERSION_REQUIRED', 'invoice_version_id');
  rejects(() => reportInput({ ...base, kind: 'review' }), 400, 'SUPPORT_REVIEW_LINK_INVALID', 'review_id');
  assert.equal(reportInput({ ...base, kind: 'invoice', invoice_id: id(), invoice_version_id: id() }).kind, 'invoice');
  rejects(() => reportReply({ body: ' ' }), 400, 'SUPPORT_BODY_REQUIRED', 'body');
});

test('notification inputs report the exact cause and field', () => {
  const all = { message_push: true, call_push: true, service_push: true, reminder_push: true };
  rejects(() => settingsInput({ ...all, service_push: 'yes' }), 400, 'NOTIFICATION_SETTING_INVALID', 'service_push');
  rejects(() => settingsInput({ message_push: true }), 400, 'NOTIFICATION_SETTING_INVALID', 'call_push');
  const token = 'ExponentPushToken[abcdefghijklmnop]';
  rejects(() => deviceInput({ token: 'bad', platform: 'ios' }), 400, 'PUSH_TOKEN_INVALID', 'token');
  rejects(() => deviceInput({ token, platform: 'web' }), 400, 'PUSH_PLATFORM_INVALID', 'platform');
  rejects(() => deviceInput({ token, platform: 'ios', android_calls: true }), 400, 'PUSH_ANDROID_CALLS_INVALID', 'android_calls');
  assert.deepEqual(deviceInput({ token, platform: 'android', android_calls: true }), { token, platform: 'android', android_calls: true });
});

test('category codes stay while the call/chat reason is exposed', () => {
  assert.deepEqual(describeException(new ServiceUnavailableException({ code: 'CALLS_UNAVAILABLE', reason: 'CALL_SERVICE_NOT_CONFIGURED' })), { status: 503, code: 'CALLS_UNAVAILABLE', reason: 'CALL_SERVICE_NOT_CONFIGURED' });
  assert.deepEqual(describeException(new ConflictException({ code: 'IDEMPOTENCY_MISMATCH', reason: 'CHAT_MESSAGE_ID_REUSED' })), { status: 409, code: 'IDEMPOTENCY_MISMATCH', reason: 'CHAT_MESSAGE_ID_REUSED' });
  assert.deepEqual(describeException(new ConflictException({ code: 'STATE_CONFLICT', reason: 'SUPPORT_REPORT_CLOSED' })), { status: 409, code: 'STATE_CONFLICT', reason: 'SUPPORT_REPORT_CLOSED' });
});
