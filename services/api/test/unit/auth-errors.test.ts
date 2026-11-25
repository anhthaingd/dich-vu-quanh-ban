import assert from 'node:assert/strict';
import test from 'node:test';
import { HttpException } from '@nestjs/common';
import { describeException } from '../../src/common/http/http-exception.filter.js';
import { credentials, refreshInput } from '../../src/modules/auth/auth.input.js';
import { challengeInput, contactInput, passwordInput, verifyInput } from '../../src/modules/auth/challenge.input.js';
import { addressInput, identifier, idempotencyKey, object, pageInput } from '../../src/modules/accounts/accounts.input.js';
import { profileInput } from '../../src/modules/accounts/profile.input.js';
import * as Security from '../../src/modules/account-security/security.input.js';
import { verificationInput } from '../../src/modules/verification/verification.service.js';
import { LocalMessages } from '../../src/integrations/local-messages.js';
import type { Pool } from 'pg';

const id = '00000000-0000-4000-8000-000000000001';
function rejects(fn: () => unknown, reason: string, field?: string, status = 400, code?: string) {
  try { fn(); } catch (error) {
    assert.ok(error instanceof HttpException, 'expected HttpException');
    const d = describeException(error);
    assert.equal(d.status, status); assert.equal(d.reason, reason); assert.equal(d.field, field);
    if (code) assert.equal(d.code, code);
    return;
  }
  assert.fail(`expected ${reason}`);
}

test('credentials name the field and cause; login has no length reason beyond required', () => {
  const reg = (b: Record<string, unknown>) => () => credentials({ email: 'a@example.test', password: 'abcd1234', display_name: 'DEMO', ...b }, true);
  rejects(() => credentials({ email: 'a@example.test', password: 'x', extra: 1 }), 'REQUEST_SHAPE_INVALID');
  rejects(reg({ email: 1 }), 'AUTH_EMAIL_INVALID', 'email');
  rejects(reg({ email: 'not-an-email' }), 'AUTH_EMAIL_INVALID', 'email');
  rejects(reg({ password: 1 }), 'AUTH_PASSWORD_REQUIRED', 'password');
  rejects(reg({ password: 'short' }), 'AUTH_PASSWORD_TOO_SHORT', 'password');
  rejects(reg({ password: 'x'.repeat(129) }), 'AUTH_PASSWORD_TOO_LONG', 'password');
  rejects(reg({ display_name: ' ' }), 'PROFILE_NAME_REQUIRED', 'display_name');
  rejects(reg({ display_name: 'x'.repeat(101) }), 'PROFILE_NAME_TOO_LONG', 'display_name');
  rejects(reg({ display_name: 'a\u0001b' }), 'PROFILE_NAME_INVALID', 'display_name');
  rejects(() => credentials({ email: 'a@example.test', password: '' }), 'AUTH_PASSWORD_REQUIRED', 'password');
  rejects(() => refreshInput({ refresh_token: 'zz' }), 'AUTH_REFRESH_TOKEN_INVALID', 'refresh_token');
});

test('challenge inputs: contact, purpose, code format and password', () => {
  rejects(() => contactInput(''), 'CONTACT_REQUIRED', 'contact');
  rejects(() => contactInput('0900000000', 'new_contact'), 'CONTACT_INVALID', 'new_contact');
  rejects(() => challengeInput({ contact: 'a@example.test', purpose: 'login' }), 'CHALLENGE_PURPOSE_INVALID', 'purpose');
  rejects(() => verifyInput({ challenge_id: id, code: '12a456' }), 'CODE_FORMAT_INVALID', 'code');
  rejects(() => verifyInput({ challenge_id: 'x', code: '123456' }), 'ID_INVALID', 'challenge_id');
  rejects(() => passwordInput({ password: '' }), 'AUTH_PASSWORD_REQUIRED', 'password');
  rejects(() => passwordInput({ password: 'x'.repeat(129) }), 'AUTH_PASSWORD_TOO_LONG', 'password');
});

test('shared parsers: ids, idempotency keys, shape, paging and addresses', () => {
  rejects(() => identifier('nope'), 'ID_INVALID');
  rejects(() => ['nope'].map(identifier as (v: unknown) => string), 'ID_INVALID');
  rejects(() => idempotencyKey(undefined), 'IDEMPOTENCY_KEY_REQUIRED');
  rejects(() => object([], []), 'REQUEST_SHAPE_INVALID');
  rejects(() => pageInput({ limit: '0' }), 'LIMIT_INVALID', 'limit');
  rejects(() => pageInput({ cursor: '' }), 'CURSOR_INVALID', 'cursor');
  rejects(() => pageInput({ other: '1' }), 'REQUEST_SHAPE_INVALID');
  const address = (b: Record<string, unknown> = {}, point: Record<string, unknown> = {}) => () => addressInput({ label: 'Home', address: { text: 'Street', point: { latitude: 10, longitude: 106, ...point } }, is_default: false, expected_version: 1, ...b }, true);
  rejects(address({}, { latitude: 91 }), 'ADDRESS_POINT_INVALID', 'address.point.latitude');
  rejects(address({}, { longitude: 'x' }), 'ADDRESS_POINT_INVALID', 'address.point.longitude');
  rejects(address({ is_default: 'yes' }), 'ADDRESS_DEFAULT_INVALID', 'is_default');
  rejects(address({ expected_version: 0 }), 'EXPECTED_VERSION_REQUIRED', 'expected_version');
  rejects(address({ label: ' ' }), 'ADDRESS_LABEL_INVALID', 'label');
  rejects(address({ address: { text: '', point: { latitude: 1, longitude: 1 } } }), 'ADDRESS_TEXT_INVALID', 'address.text');
  rejects(address({ address: { text: 'x', point: [] } }), 'REQUEST_SHAPE_INVALID', 'address.point');
  assert.equal(address()().label, 'Home');
});

test('profile edit names the key, version, locale and name rules', () => {
  rejects(() => profileInput({ expected_version: 1 }, undefined), 'IDEMPOTENCY_KEY_REQUIRED');
  rejects(() => profileInput({ expected_version: 1, x: 1 }, id), 'REQUEST_SHAPE_INVALID');
  rejects(() => profileInput({ expected_version: 0 }, id), 'EXPECTED_VERSION_REQUIRED', 'expected_version');
  rejects(() => profileInput({ expected_version: 1, locale: 'fr' }, id), 'LOCALE_INVALID', 'locale');
  rejects(() => profileInput({ expected_version: 1, display_name: '' }, id), 'PROFILE_NAME_REQUIRED', 'display_name');
  rejects(() => profileInput({ expected_version: 1, display_name: 'x'.repeat(101) }, id), 'PROFILE_NAME_TOO_LONG', 'display_name');
});

test('account security inputs map each rule to a reason and the body field', () => {
  rejects(() => Security.challenge({ purpose: 'x', contact: 'a@example.test' }), 'CHALLENGE_PURPOSE_INVALID', 'purpose');
  rejects(() => Security.reset({ challenge_id: id, code: '123456', new_password: 'short' }), 'AUTH_PASSWORD_TOO_SHORT', 'new_password');
  rejects(() => Security.changePassword({ password: '', new_password: 'abcd1234' }), 'AUTH_PASSWORD_REQUIRED', 'password');
  rejects(() => Security.identityChange({ expected_version: 1, kind: 'phone', new_contact: 'a@example.test', password: 'p' }), 'IDENTITY_KIND_MISMATCH', 'kind');
  rejects(() => Security.identityChange({ expected_version: 'x', kind: 'email', new_contact: 'a@example.test', password: 'p' }), 'EXPECTED_VERSION_REQUIRED', 'expected_version');
  rejects(() => Security.recoveryReport({ contact_claim: 'bad', reachable_contact: 'a@example.test', description: 'x' }), 'CONTACT_INVALID', 'contact_claim');
  rejects(() => Security.recoveryReport({ contact_claim: 'a@example.test', reachable_contact: 'b@example.test', description: ' ' }), 'SECURITY_TEXT_REQUIRED', 'description');
  rejects(() => Security.recoveryDecision({ expected_version: 1, decision: 'maybe', reason: 'x' }), 'ACCOUNT_REVIEW_ACTION_INVALID', 'decision');
  rejects(() => Security.deletion({ expected_version: 1, reason: 'x', password: 'p', forfeit_points: 'yes' }), 'DELETION_FORFEIT_REQUIRED', 'forfeit_points');
  rejects(() => Security.deletion({ expected_version: 1, reason: 'x'.repeat(1001), password: 'p', forfeit_points: true }), 'SECURITY_TEXT_TOO_LONG', 'reason');
  rejects(() => Security.queueInput({ state: 'done' }), 'ACCOUNT_QUEUE_STATE_INVALID', 'state');
});

test('verification input names the document and version problems', () => {
  const body = (b: Record<string, unknown>) => () => verificationInput({ document_asset_ids: [id], details: { kind: 'identity', statement: 'DEMO' }, ...b });
  rejects(body({ details: { kind: 'x', statement: 'DEMO' } }), 'VERIFICATION_KIND_INVALID', 'details.kind');
  rejects(body({ document_asset_ids: [] }), 'VERIFICATION_DOCUMENTS_REQUIRED', 'document_asset_ids');
  rejects(body({ document_asset_ids: Array.from({ length: 11 }, (_, i) => id.slice(0, -2) + String(i).padStart(2, '0')) }), 'VERIFICATION_DOCUMENTS_TOO_MANY', 'document_asset_ids');
  rejects(body({ document_asset_ids: [id, id] }), 'VERIFICATION_DOCUMENTS_DUPLICATE', 'document_asset_ids');
  rejects(body({ document_asset_ids: ['nope'] }), 'ID_INVALID', 'document_asset_ids');
  rejects(body({ previous_request_id: id }), 'EXPECTED_VERSION_REQUIRED', 'expected_version');
  rejects(body({ expected_version: 1 }), 'VERIFICATION_PREVIOUS_REQUIRED', 'previous_request_id');
});

test('local delivery says the contact is not enabled for testing (code LOCAL_CONTACT_NOT_ALLOWED)', () => {
  const pool = {} as Pool;
  rejects(() => new LocalMessages(pool).requireContact('a@example.test'), 'LOCAL_MESSAGES_NOT_CONFIGURED', undefined, 503, 'SERVICE_UNAVAILABLE');
  const local = new LocalMessages(pool, { secret: 's', mailpit: 'http://x', smsDirectory: '/tmp/x', contacts: ['ok@example.test'] });
  local.requireContact('ok@example.test');
  rejects(() => local.requireContact('other@example.test'), 'LOCAL_EMAIL_NOT_ALLOWED', undefined, 503, 'LOCAL_CONTACT_NOT_ALLOWED');
  rejects(() => local.requireContact('+84900000001'), 'LOCAL_PHONE_NOT_ALLOWED', undefined, 503, 'LOCAL_CONTACT_NOT_ALLOWED');
  new LocalMessages(pool, { secret: 's', mailpit: 'http://x', smsDirectory: '/tmp/x', contacts: [], allowAnyEmail: true }).requireContact('any@example.test');
});
