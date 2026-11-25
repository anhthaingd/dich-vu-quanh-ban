import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException, ConflictException, ForbiddenException, HttpException, NotFoundException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { describeException } from '../../src/common/http/http-exception.filter.js';

test('error body keeps the category code and adds the exact reason and field', () => {
  assert.deepEqual(describeException(new BadRequestException({ code: 'VALIDATION', reason: 'PHONE_INVALID', field: 'phone' })), { status: 400, code: 'VALIDATION', reason: 'PHONE_INVALID', field: 'phone' });
  assert.deepEqual(describeException(new NotFoundException({ reason: 'JOB_NOT_FOUND' })), { status: 404, code: 'NOT_FOUND', reason: 'JOB_NOT_FOUND' });
  assert.deepEqual(describeException(new ConflictException({ code: 'STATE_CONFLICT', reason: 'JOB_ALREADY_ACCEPTED' })), { status: 409, code: 'STATE_CONFLICT', reason: 'JOB_ALREADY_ACCEPTED' });
  assert.deepEqual(describeException(new ServiceUnavailableException({ code: 'LOCAL_CONTACT_NOT_ALLOWED' })), { status: 503, code: 'LOCAL_CONTACT_NOT_ALLOWED' });
});

test('legacy non-category codes become the reason; category codes stay the code', () => {
  assert.deepEqual(describeException(new ConflictException({ code: 'LAST_GRANT_MANAGER' })), { status: 409, code: 'CONFLICT', reason: 'LAST_GRANT_MANAGER' });
  assert.deepEqual(describeException(new HttpException({ code: 'RATE_LIMITED' }, 429)), { status: 429, code: 'RATE_LIMITED' });
  assert.deepEqual(describeException(new UnprocessableEntityException({ code: 'INSUFFICIENT_POINTS' })), { status: 422, code: 'INSUFFICIENT_POINTS' });
  assert.deepEqual(describeException(new ForbiddenException()), { status: 403, code: 'FORBIDDEN' });
  assert.deepEqual(describeException(new ConflictException()), { status: 409, code: 'CONFLICT' });
});

test('unsafe reason/field values and 500 details never reach the client', () => {
  assert.deepEqual(describeException(new BadRequestException({ reason: 'select * from users', field: 'a b' })), { status: 400, code: 'VALIDATION' });
  assert.deepEqual(describeException(new BadRequestException('free text message')), { status: 400, code: 'VALIDATION' });
  assert.deepEqual(describeException(new HttpException({ reason: 'DB_DOWN', field: 'x' }, 500)), { status: 500, code: 'INTERNAL' });
  assert.deepEqual(describeException(new Error('boom')), { status: 500, code: 'INTERNAL' });
});

test('body parser failures map to client errors instead of 500', () => {
  assert.deepEqual(describeException(Object.assign(new Error('x'), { status: 400, type: 'entity.parse.failed' })), { status: 400, code: 'VALIDATION', reason: 'BODY_INVALID_JSON' });
  assert.deepEqual(describeException(Object.assign(new Error('x'), { status: 413, type: 'entity.too.large' })), { status: 413, code: 'PAYLOAD_TOO_LARGE', reason: 'BODY_TOO_LARGE' });
  // Nest's express adapter wraps http-errors as a 413 HttpException.
  assert.deepEqual(describeException(new HttpException('Payload Too Large', 413)), { status: 413, code: 'PAYLOAD_TOO_LARGE', reason: 'BODY_TOO_LARGE' });
});
