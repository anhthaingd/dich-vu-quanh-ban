import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { describeException } from '../../src/common/http/http-exception.filter.js';
import { jobChangeInput, jobCreateInput, jobsQuery, idempotencyKey, pathId, versionInput } from '../../src/modules/jobs/jobs.input.js';
import { jobStateReason } from '../../src/modules/jobs/jobs.access.js';
import { actionInput, draftInput } from '../../src/modules/invoices/invoices.input.js';
import { invoiceStateReason } from '../../src/modules/invoices/settlement.js';
import { replyInput, reviewInput, visibilityInput } from '../../src/modules/reviews/reviews.input.js';

const id = '00000000-0000-4000-8000-000000000001', other = '00000000-0000-4000-8000-000000000002';
// The error body the client receives for a parser call.
function rejected(run: () => unknown) {
  try { run(); } catch (e) { assert.ok(e instanceof BadRequestException); const { status, ...body } = describeException(e); assert.equal(status, 400); return body; }
  assert.fail('expected a rejection');
}
const job = { partner_id: id, skills: [{ skill_id: other, schema_version: 1 }], service_mode: 'at_customer', address: { text: 'Số 1', point: { latitude: 21, longitude: 105 } }, time_mode: 'now' };
const create = (patch: Record<string, unknown>) => rejected(() => jobCreateInput({ ...job, ...patch }));

test('job request names the exact field and rule that failed', () => {
  assert.deepEqual(create({ service_mode: 'boat' }), { code: 'VALIDATION', reason: 'JOB_SERVICE_MODE_INVALID', field: 'service_mode' });
  assert.deepEqual(create({ time_mode: 'later' }), { code: 'VALIDATION', reason: 'JOB_TIME_MODE_INVALID', field: 'time_mode' });
  assert.deepEqual(create({ skills: [] }), { code: 'VALIDATION', reason: 'JOB_SKILLS_REQUIRED', field: 'skills' });
  assert.deepEqual(create({ skills: [{ skill_id: 'x', schema_version: 1 }] }), { code: 'VALIDATION', reason: 'JOB_SKILL_INVALID', field: 'skills.skill_id' });
  assert.deepEqual(create({ skills: [{ skill_id: other, schema_version: 0 }] }), { code: 'VALIDATION', reason: 'JOB_SKILL_INVALID', field: 'skills.schema_version' });
  assert.deepEqual(create({ skills: [{ skill_id: other, schema_version: 1, answers: [] }] }), { code: 'VALIDATION', reason: 'JOB_SKILL_ANSWERS_INVALID', field: 'skills.answers' });
  assert.deepEqual(create({ skills: [{ skill_id: other, schema_version: 1 }, { skill_id: other.toUpperCase(), schema_version: 1 }] }), { code: 'VALIDATION', reason: 'JOB_SKILL_DUPLICATE', field: 'skills' });
  assert.deepEqual(create({ address: 'Hà Nội' }), { code: 'VALIDATION', reason: 'JOB_ADDRESS_INVALID', field: 'address' });
  assert.deepEqual(create({ address: { text: ' ', point: { latitude: 21, longitude: 105 } } }), { code: 'VALIDATION', reason: 'JOB_ADDRESS_TEXT_INVALID', field: 'address.text' });
  assert.deepEqual(create({ address: { text: 'Số 1', point: { latitude: 91, longitude: 105 } } }), { code: 'VALIDATION', reason: 'JOB_ADDRESS_POINT_INVALID', field: 'address.point' });
  assert.deepEqual(create({ time_mode: 'scheduled' }), { code: 'VALIDATION', reason: 'JOB_SCHEDULED_AT_REQUIRED', field: 'scheduled_at' });
  assert.deepEqual(create({ scheduled_at: '2030-01-01T10:00:00+07:00' }), { code: 'VALIDATION', reason: 'JOB_SCHEDULED_AT_NOT_ALLOWED', field: 'scheduled_at' });
  assert.deepEqual(create({ time_mode: 'scheduled', scheduled_at: '2030-02-30T10:00:00+07:00' }), { code: 'VALIDATION', reason: 'JOB_SCHEDULED_AT_INVALID', field: 'scheduled_at' });
  assert.deepEqual(create({ time_mode: 'scheduled', scheduled_at: 'tomorrow' }), { code: 'VALIDATION', reason: 'JOB_SCHEDULED_AT_INVALID', field: 'scheduled_at' });
  assert.deepEqual(create({ service_mode: 'at_shop' }), { code: 'VALIDATION', reason: 'JOB_LOCATION_REQUIRED', field: 'location_id' });
  assert.deepEqual(create({ location_id: id }), { code: 'VALIDATION', reason: 'JOB_LOCATION_NOT_ALLOWED', field: 'location_id' });
  assert.deepEqual(create({ service_mode: 'at_shop', location_id: 'shop' }), { code: 'VALIDATION', reason: 'JOB_LOCATION_INVALID', field: 'location_id' });
  assert.deepEqual(create({ partner_id: 'p' }), { code: 'VALIDATION', reason: 'JOB_PARTNER_INVALID', field: 'partner_id' });
  assert.deepEqual(create({ note: 'a\u0000b' }), { code: 'VALIDATION', reason: 'JOB_NOTE_INVALID', field: 'note' });
  // A valid request still parses unchanged.
  assert.equal(jobCreateInput({ ...job, note: 'dòng 1\ndòng 2' }).note, 'dòng 1\ndòng 2');
});

test('job changes name the missing or wrong field', () => {
  assert.deepEqual(rejected(() => jobChangeInput('accept', {})), { code: 'VALIDATION', reason: 'EXPECTED_VERSION_REQUIRED', field: 'expected_version' });
  assert.deepEqual(rejected(() => jobChangeInput('accept', { expected_version: 1, eta: '10:00' })), { code: 'VALIDATION', reason: 'JOB_ETA_INVALID', field: 'eta' });
  assert.deepEqual(rejected(() => jobChangeInput('decline', { expected_version: 1, reason: '  ' })), { code: 'VALIDATION', reason: 'JOB_REASON_REQUIRED', field: 'reason' });
  assert.deepEqual(rejected(() => jobChangeInput('reschedule', { expected_version: 1, scheduled_at: '2030-13-01T10:00Z' })), { code: 'VALIDATION', reason: 'JOB_SCHEDULED_AT_INVALID', field: 'scheduled_at' });
  assert.deepEqual(rejected(() => jobChangeInput('reschedule', { expected_version: 1, scheduled_at: '2030-12-01T10:00Z', reason: 'a\u0007' })), { code: 'VALIDATION', reason: 'JOB_REASON_INVALID', field: 'reason' });
  assert.deepEqual(rejected(() => jobChangeInput('stop', { expected_version: 1, reason: 'x' })), { code: 'VALIDATION', reason: 'JOB_AGREED_CHARGES_REQUIRED', field: 'has_agreed_charges' });
  assert.deepEqual(rejected(() => jobChangeInput('assignments', { expected_version: 1 })), { code: 'VALIDATION', reason: 'JOB_ASSIGNEE_REQUIRED', field: 'membership_id' });
  assert.deepEqual(rejected(() => jobsQuery({ state: 'lost' })), { code: 'VALIDATION', reason: 'JOB_STATE_FILTER_INVALID', field: 'state' });
  assert.deepEqual(rejected(() => jobsQuery({ partner_id: 'x' })), { code: 'VALIDATION', reason: 'JOB_PARTNER_INVALID', field: 'partner_id' });
  assert.deepEqual(rejected(() => pathId('1')), { code: 'VALIDATION', reason: 'ID_INVALID', field: 'id' });
  assert.deepEqual(rejected(() => idempotencyKey(undefined)), { code: 'VALIDATION', reason: 'IDEMPOTENCY_KEY_REQUIRED' });
  assert.deepEqual(rejected(() => versionInput(0)), { code: 'VALIDATION', reason: 'EXPECTED_VERSION_REQUIRED', field: 'expected_version' });
});

test('invoice and review inputs name the exact field', () => {
  const draft = { expected_version: 1, labor: '100', materials: '0' };
  assert.deepEqual(rejected(() => draftInput({ ...draft, labor: '1.5' })), { code: 'VALIDATION', reason: 'INVOICE_LABOR_INVALID', field: 'labor' });
  assert.deepEqual(rejected(() => draftInput({ ...draft, materials: -1 })), { code: 'VALIDATION', reason: 'INVOICE_MATERIALS_INVALID', field: 'materials' });
  assert.deepEqual(rejected(() => draftInput({ ...draft, result_asset_ids: [id, id] })), { code: 'VALIDATION', reason: 'INVOICE_PHOTOS_INVALID', field: 'result_asset_ids' });
  assert.deepEqual(rejected(() => draftInput({ ...draft, result_asset_ids: ['x'] })), { code: 'VALIDATION', reason: 'INVOICE_PHOTOS_INVALID', field: 'result_asset_ids' });
  assert.deepEqual(rejected(() => draftInput({ ...draft, industry_details: [] })), { code: 'VALIDATION', reason: 'INVOICE_DETAILS_INVALID', field: 'industry_details' });
  assert.deepEqual(rejected(() => draftInput({ ...draft, note: 1 })), { code: 'VALIDATION', reason: 'INVOICE_NOTE_INVALID', field: 'note' });
  assert.deepEqual(rejected(() => actionInput('send', { expected_version: 1, draft_version_id: 'v' })), { code: 'VALIDATION', reason: 'INVOICE_VERSION_ID_INVALID', field: 'draft_version_id' });
  assert.deepEqual(rejected(() => actionInput('revision-requests', { expected_version: 1, reason: '' })), { code: 'VALIDATION', reason: 'INVOICE_REVISION_REASON_REQUIRED', field: 'reason' });
  assert.deepEqual(rejected(() => actionInput('confirm', { expected_version: 1, version_id: id, points_used: '01' })), { code: 'VALIDATION', reason: 'INVOICE_POINTS_INVALID', field: 'points_used' });
  assert.deepEqual(rejected(() => actionInput('payment-reported', { expected_version: 1, version_id: id, confirmed: false })), { code: 'VALIDATION', reason: 'INVOICE_PAYMENT_CONFIRMATION_REQUIRED', field: 'confirmed' });
  assert.deepEqual(rejected(() => actionInput('settle', { expected_version: 1, version_id: id })), { code: 'VALIDATION', reason: 'INVOICE_RECEIPT_CONFIRMATION_REQUIRED', field: 'received_in_full' });
  assert.deepEqual(rejected(() => reviewInput({ stars: 6 })), { code: 'VALIDATION', reason: 'REVIEW_STARS_INVALID', field: 'stars' });
  assert.deepEqual(rejected(() => reviewInput({ stars: 5, body: 1 })), { code: 'VALIDATION', reason: 'REVIEW_TEXT_INVALID', field: 'body' });
  assert.deepEqual(rejected(() => reviewInput({ stars: 5, asset_id: 'x' })), { code: 'VALIDATION', reason: 'REVIEW_PHOTO_INVALID', field: 'asset_id' });
  assert.deepEqual(rejected(() => reviewInput({ stars: 5 }, true)), { code: 'VALIDATION', reason: 'EXPECTED_VERSION_REQUIRED', field: 'expected_version' });
  assert.equal(reviewInput({ stars: 5, asset_id: null, expected_version: 1 }, true).asset_id, null);
  assert.deepEqual(rejected(() => visibilityInput({ expected_version: 1 })), { code: 'VALIDATION', reason: 'REVIEW_VISIBILITY_INVALID', field: 'removed' });
  assert.deepEqual(rejected(() => visibilityInput({ expected_version: 1, removed: true, reason: 1 })), { code: 'VALIDATION', reason: 'REVIEW_VISIBILITY_REASON_INVALID', field: 'reason' });
  assert.deepEqual(rejected(() => replyInput({ expected_version: 1, body: ' ' })), { code: 'VALIDATION', reason: 'REVIEW_REPLY_REQUIRED', field: 'body' });
});

test('state conflicts name the job or invoice state that blocks the action', () => {
  assert.deepEqual(['requested', 'accepted', 'awaiting_settlement', 'completed', 'declined', 'withdrawn', 'stopped', '?'].map(jobStateReason),
    ['JOB_NOT_ACCEPTED_YET', 'JOB_ALREADY_ACCEPTED', 'JOB_AWAITING_SETTLEMENT', 'JOB_ALREADY_COMPLETED', 'JOB_DECLINED', 'JOB_WITHDRAWN', 'JOB_STOPPED', 'JOB_ACTION_NOT_AVAILABLE']);
  assert.deepEqual(['draft', 'sent', 'revision_requested', 'locked', 'settled', '?'].map(invoiceStateReason),
    ['INVOICE_NOT_SENT', 'INVOICE_ALREADY_SENT', 'INVOICE_REVISION_REQUESTED', 'INVOICE_ALREADY_CONFIRMED', 'INVOICE_ALREADY_SETTLED', 'INVOICE_ACTION_NOT_AVAILABLE']);
});
