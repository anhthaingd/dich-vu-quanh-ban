import assert from 'node:assert/strict';
import test from 'node:test';
import { describeException } from '../../src/common/http/http-exception.filter.js';
import { decisionInput, noteInput, queueInput, reportQueueInput, idempotencyKey, pathId, page, text } from '../../src/modules/moderation/moderation.input.js';
import { operationInput } from '../../src/modules/moderation/operations.input.js';
import { completionInput } from '../../src/modules/moderation/completion.input.js';
import { adminInvitationInput, invitationChangeInput, invitationTokenInput } from '../../src/modules/backoffice/admin-invitations.input.js';
import { auditInput, grantDirectoryInput, grantsInput, metricsInput } from '../../src/modules/backoffice/backoffice.input.js';
import { AdminAuthController } from '../../src/modules/admin-auth/admin-auth.controller.js';
import { AdminAuthService } from '../../src/modules/admin-auth/admin-auth.service.js';
import { RuntimeLease } from '../../src/database/runtime-lease.js';

const id = '00000000-0000-4000-8000-000000000001';
function fails(run: () => unknown, status: number, code: string, reason: string, field?: string) {
  let error: unknown;
  try { run(); } catch (e) { error = e; }
  assert.ok(error, `expected ${reason}`);
  assert.deepEqual(describeException(error), { status, code, reason, ...(field ? { field } : {}) });
}
async function rejects(run: () => Promise<unknown>, status: number, code: string, reason: string) {
  let error: unknown;
  try { await run(); } catch (e) { error = e; }
  assert.ok(error, `expected ${reason}`);
  assert.deepEqual(describeException(error), { status, code, reason });
}
const bad = (run: () => unknown, reason: string, field?: string) => fails(run, 400, 'VALIDATION', reason, field);

test('shared admin input helpers name the exact cause', () => {
  bad(() => pathId('nope'), 'ID_INVALID');
  bad(() => idempotencyKey(undefined), 'IDEMPOTENCY_KEY_REQUIRED');
  bad(() => page({ limit: '0' }), 'LIMIT_INVALID', 'limit');
  bad(() => page({ cursor: '' }), 'CURSOR_INVALID', 'cursor');
  bad(() => page({ other: '1' }), 'ADMIN_QUERY_UNEXPECTED');
  bad(() => queueInput({ q: 'x'.repeat(201) }), 'ADMIN_SEARCH_TOO_LONG', 'q');
  bad(() => queueInput({ state: 'x'.repeat(41) }), 'ADMIN_STATE_FILTER_INVALID', 'state');
  assert.deepEqual(queueInput({ q: ' a ', limit: '5' }), { limit: 5, cursor: undefined, q: 'a', state: 'all' });
  // Without a rule (other modules' callers) text keeps its bare 400.
  assert.deepEqual(describeException((() => { try { text(''); } catch (e) { return e; } })()), { status: 400, code: 'VALIDATION' });
});

test('report queue filters and decisions report the field at fault', () => {
  bad(() => reportQueueInput({ from: '2026-01-01T00:00:00Z' }), 'ADMIN_DATE_RANGE_INVALID', 'to');
  bad(() => reportQueueInput({ from: 'x', to: '2026-01-01T00:00:00Z' }), 'ADMIN_DATE_INVALID', 'from');
  bad(() => reportQueueInput({ from: '2026-01-02T00:00:00Z', to: '2026-01-01T00:00:00Z' }), 'ADMIN_DATE_RANGE_INVALID', 'to');
  bad(() => reportQueueInput({ sort: 'random' }), 'ADMIN_SORT_INVALID', 'sort');
  bad(() => decisionInput([], 'reports'), 'ADMIN_BODY_UNEXPECTED');
  bad(() => decisionInput({ expected_version: 0, state: 'closed', reason: 'r' }, 'reports'), 'EXPECTED_VERSION_REQUIRED', 'expected_version');
  bad(() => decisionInput({ expected_version: 1, state: 'deleted', reason: 'r' }, 'reports'), 'ADMIN_DECISION_INVALID', 'state');
  bad(() => decisionInput({ expected_version: 1, action: 'drop', reason: 'r' }, 'reviews'), 'ADMIN_DECISION_INVALID', 'action');
  bad(() => decisionInput({ expected_version: 1, action: 'reject', reason: 'r', checked: 'yes' }, 'verifications'), 'ADMIN_CHECKED_INVALID', 'checked');
  bad(() => decisionInput({ expected_version: 1, action: 'approve', reason: 'r' }, 'verifications'), 'ADMIN_VERIFICATION_CHECK_REQUIRED', 'checked');
  bad(() => decisionInput({ expected_version: 1, action: 'keep', reason: ' ' }, 'reviews'), 'ADMIN_REASON_REQUIRED', 'reason');
  bad(() => decisionInput({ expected_version: 1, action: 'keep', reason: 'x'.repeat(4001) }, 'reviews'), 'ADMIN_REASON_TOO_LONG', 'reason');
  bad(() => noteInput({ expected_version: 1, body: '' }), 'ADMIN_NOTE_REQUIRED', 'body');
  bad(() => noteInput({ expected_version: 1, body: 'x'.repeat(4001) }), 'ADMIN_NOTE_TOO_LONG', 'body');
  assert.deepEqual(decisionInput({ expected_version: 2, action: 'approve', reason: ' ok ', checked: true }, 'verifications'), { expected_version: 2, action: 'approve', reason: 'ok', checked: true });
});

test('operations and catalog input name each rule', () => {
  bad(() => operationInput({ expected_version: 1, action: 'ban', reason: 'r' }, 'users'), 'ADMIN_DECISION_INVALID', 'action');
  bad(() => operationInput({ expected_version: 1, action: 'warn', reason: 'x'.repeat(1001) }, 'partners'), 'ADMIN_REASON_TOO_LONG', 'reason');
  bad(() => operationInput({ expected_version: 1, reason: 'r', name_vi: 'A', active: true }, 'categories', true), 'ADMIN_CATALOG_CREATE_VERSION_UNEXPECTED', 'expected_version');
  bad(() => operationInput({ code: 'Bad', reason: 'r', name_vi: 'A' }, 'categories', true), 'ADMIN_CATALOG_CODE_INVALID', 'code');
  bad(() => operationInput({ expected_version: 1, code: 'x', reason: 'r', name_vi: 'A', active: true }, 'categories'), 'ADMIN_CATALOG_FIELD_NOT_EDITABLE', 'code');
  bad(() => operationInput({ expected_version: 1, reason: 'r', name_vi: 'A' }, 'skills'), 'ADMIN_CATALOG_ACTIVE_INVALID', 'active');
  bad(() => operationInput({ code: 'a', reason: 'r', name_vi: 'A', category_ids: [id] }, 'categories', true), 'ADMIN_CATALOG_FIELD_NOT_ALLOWED', 'category_ids');
  bad(() => operationInput({ code: 'a', reason: 'r', name_vi: 'A', parent_id: 'x' }, 'categories', true), 'ADMIN_CATALOG_PARENT_INVALID', 'parent_id');
  bad(() => operationInput({ code: 'a', reason: 'r', name_vi: 'A', category_ids: [] }, 'skills', true), 'ADMIN_CATALOG_SKILL_CATEGORY_REQUIRED', 'category_ids');
  bad(() => operationInput({ code: 'a', reason: 'r', name_vi: 'A', category_ids: ['x'] }, 'skills', true), 'ADMIN_CATALOG_SKILL_CATEGORY_INVALID', 'category_ids');
  bad(() => operationInput({ code: 'a', reason: 'r', name_vi: 'x'.repeat(201) }, 'categories', true), 'ADMIN_CATALOG_NAME_TOO_LONG', 'name_vi');
});

test('completion on behalf input separates checklist, evidence and preview', () => {
  const ok = { expected_version: 1, invoice_id: id, invoice_version_id: id, invoice_expected_version: 1, reason: 'Done', evidence_ids: [id], preview_token: 't', checked: true };
  bad(() => completionInput({ ...ok, checked: false }), 'ADMIN_COMPLETION_CHECK_REQUIRED', 'checked');
  bad(() => completionInput({ ...ok, evidence_ids: [] }), 'ADMIN_COMPLETION_EVIDENCE_REQUIRED', 'evidence_ids');
  bad(() => completionInput({ ...ok, evidence_ids: [id, id] }), 'ADMIN_COMPLETION_EVIDENCE_INVALID', 'evidence_ids');
  bad(() => completionInput({ ...ok, evidence_ids: ['x'] }), 'ADMIN_COMPLETION_EVIDENCE_INVALID', 'evidence_ids');
  bad(() => completionInput({ ...ok, preview_token: 1 }), 'ADMIN_COMPLETION_PREVIEW_INVALID', 'preview_token');
  bad(() => completionInput({ ...ok, invoice_id: 'x' }), 'ID_INVALID', 'invoice_id');
  bad(() => completionInput({ ...ok, invoice_expected_version: 0 }), 'EXPECTED_VERSION_REQUIRED', 'invoice_expected_version');
  bad(() => completionInput({ ...ok, reason: '' }), 'ADMIN_REASON_REQUIRED', 'reason');
  assert.equal(completionInput(ok).reason, 'Done');
});

test('invitation and grant input name the field at fault', () => {
  const ok = { name: 'DEMO', email: 'demo@example.com', permissions: ['support.read'], reason: 'r' };
  bad(() => adminInvitationInput({ ...ok, email: '+84901234567' }), 'ADMIN_INVITE_EMAIL_INVALID', 'email');
  bad(() => adminInvitationInput({ ...ok, email: 'nope' }), 'ADMIN_INVITE_EMAIL_INVALID', 'email');
  bad(() => adminInvitationInput({ ...ok, permissions: [] }), 'ADMIN_PERMISSIONS_REQUIRED', 'permissions');
  bad(() => adminInvitationInput({ ...ok, permissions: ['root'] }), 'ADMIN_PERMISSIONS_INVALID', 'permissions');
  bad(() => adminInvitationInput({ ...ok, name: 'x'.repeat(101) }), 'ADMIN_INVITEE_NAME_TOO_LONG', 'name');
  bad(() => invitationChangeInput({ expected_version: 1 }), 'ADMIN_REASON_REQUIRED', 'reason');
  bad(() => invitationTokenInput({ token: 'abc' }), 'ADMIN_INVITATION_CODE_FORMAT_INVALID', 'token');
  bad(() => grantsInput({ expected_version: 1, permissions: ['a'], reason: 'r' }), 'ADMIN_PERMISSIONS_INVALID', 'permissions');
  bad(() => metricsInput({ from: '2026-01-01', to: '2026-01-02T00:00:00Z' }), 'ADMIN_DATE_INVALID', 'from');
  bad(() => metricsInput({ from: '2026-01-02T00:00:00Z', to: '2026-01-01T00:00:00Z' }), 'ADMIN_DATE_RANGE_INVALID', 'to');
  bad(() => auditInput({ resource_id: 'x' }), 'ID_INVALID', 'resource_id');
  bad(() => grantDirectoryInput({ role: 'owners' }), 'ADMIN_ROLE_FILTER_INVALID', 'role');
});

test('admin MFA endpoints name the missing input before calling the service', () => {
  const controller = new AdminAuthController({} as AdminAuthService);
  bad(() => controller.verify(undefined, { password: '', code: '123456' }), 'ADMIN_PASSWORD_REQUIRED', 'password');
  bad(() => controller.verify(undefined, { password: 'p', code: '' }), 'ADMIN_MFA_CODE_REQUIRED', 'code');
  bad(() => controller.recover(undefined, { password: 'p', code: 'z'.repeat(32) }), 'ADMIN_BACKUP_CODE_FORMAT_INVALID', 'code');
  bad(() => controller.backupCodes(undefined, undefined, { extra: 1 }), 'ADMIN_BODY_UNEXPECTED');
  bad(() => controller.reset(undefined, undefined, id, id, { expected_version: 1, reason: 'x'.repeat(1001) }), 'ADMIN_REASON_TOO_LONG', 'reason');
  bad(() => controller.reset(undefined, undefined, undefined, id, { expected_version: 1, reason: 'r' }), 'IDEMPOTENCY_KEY_REQUIRED');
});

test('admin access, session and runtime failures carry their reason', async () => {
  const db = (rows: { permission: string }[]) => ({ query: async () => ({ rows }) }) as never;
  const actor = { user: { id }, sessionId: id } as never;
  const service = new AdminAuthService({} as never, {} as never, { secret: 'x'.repeat(64) });
  await rejects(() => new AdminAuthService({} as never, {} as never).grants(db([]), actor), 503, 'SERVICE_UNAVAILABLE', 'ADMIN_NOT_CONFIGURED');
  await rejects(() => service.grants(db([]), actor), 403, 'FORBIDDEN', 'ADMIN_ACCESS_REQUIRED');
  await rejects(() => service.grants(db([{ permission: 'support.read' }]), actor, 'grant.manage'), 403, 'FORBIDDEN', 'ADMIN_PERMISSION_REQUIRED');
  await rejects(() => service.check(db([{ permission: 'support.read' }]), actor, undefined), 403, 'REAUTH_REQUIRED', 'ADMIN_SESSION_REQUIRED');
  const noSession = (() => { let n = 0; return { query: async () => ({ rows: n++ ? [] : [{ permission: 'support.read' }] }) }; })() as never;
  await rejects(() => service.check(noSession, actor, 'a'.repeat(64)), 403, 'REAUTH_REQUIRED', 'ADMIN_SESSION_EXPIRED');
  const lease = new RuntimeLease({} as never, true);
  await rejects(() => lease.check(), 503, 'SERVICE_UNAVAILABLE', 'SERVICE_RUNTIME_INACTIVE');
});
