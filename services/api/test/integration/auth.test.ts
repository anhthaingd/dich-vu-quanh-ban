import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import { createHash } from 'node:crypto';
import { databaseFixture } from '../helpers/database.js';
import { readFile } from 'node:fs/promises';
const secret = 'isolated-auth-test-secret-'.repeat(3);
const password = 'a long PASSWORD_CANARY phrase';
const account = { email: 'AUTH_CANARY@example.test', password, display_name: 'Người thử' };
const post = (base: string, path: string, body: unknown = {}, token?: string) => fetch(base + path, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
});
const me = (base: string, token: string) => fetch(base + '/me', { headers: { Authorization: `Bearer ${token}` } });
test('real registration/login/rotation/logout: hashes, unverified contact, revocation and safe logs', async () => {
  const f = await databaseFixture(secret);
  try {
    const { Ajv2020 } = await import('ajv/dist/2020.js');
    const { default: formats } = await import('ajv-formats');
    const spec = JSON.parse(await readFile(new URL('../../../../docs/technical-design/openapi.json', import.meta.url), 'utf8'));
    const ajv = new Ajv2020({ strict: false }); (formats as unknown as (instance: typeof ajv) => void)(ajv);
    const matches = (name: string, body: unknown) => {
      const validate = ajv.compile({ ...spec.components.schemas[name], components: spec.components });
      assert.ok(validate(body), JSON.stringify(validate.errors));
    };
    const registered = await post(f.base, '/auth/register', account);
    assert.equal(registered.status, 201); assert.equal(registered.headers.get('cache-control'), 'no-store');
    const first = await registered.json();
    matches('Session', first);
    const accessSeconds = (Date.parse(first.expires_at) - Date.now()) / 1000;
    assert.ok(accessSeconds > 895 && accessSeconds <= 900, 'access token expires after 15 minutes');
    assert.equal(first.user.email_verified, false); assert.equal(first.user.phone_verified, false);
    assert.deepEqual(first.user.admin_permissions, []); assert.deepEqual(first.user.partner_ids, []);
    const profile = await me(f.base, first.access_token); assert.equal(profile.status, 200); matches('Me', await profile.json());
    const { rows: [identity] } = await f.pool.query('SELECT * FROM identities');
    assert.equal(identity.subject, account.email.toLowerCase()); assert.notEqual(identity.password_hash, password);
    assert.match(identity.password_hash, /^scrypt-v1\$/); assert.equal(identity.verified_at, null);
    const { rows: [stored] } = await f.pool.query('SELECT * FROM sessions');
    assert.equal(stored.refresh_hash, createHash('sha256').update(first.refresh_token).digest('hex'));
    const sessionDays = (stored.expires_at.getTime() - Date.now()) / 86400000;
    assert.ok(sessionDays > 29.99 && sessionDays <= 30, 'session has an absolute 30-day lifetime');
    const rotatedResponse = await post(f.base, '/auth/refresh', { refresh_token: first.refresh_token });
    assert.equal(rotatedResponse.status, 200); const rotated = await rotatedResponse.json();
    assert.notEqual(rotated.refresh_token, first.refresh_token);
    const { rows: [active] } = await f.pool.query('SELECT expires_at FROM sessions WHERE revoked_at IS NULL');
    assert.equal(active.expires_at.getTime(), stored.expires_at.getTime(), 'rotation cannot extend the session lifetime');
    assert.equal((await me(f.base, first.access_token)).status, 401);
    assert.equal((await me(f.base, rotated.access_token)).status, 200);
    // Replay commits family revocation, rather than rolling it back with 401.
    assert.equal((await post(f.base, '/auth/refresh', { refresh_token: first.refresh_token })).status, 401);
    assert.equal((await me(f.base, rotated.access_token)).status, 401);
    const signedIn = await post(f.base, '/auth/login', { email: account.email, password });
    assert.equal(signedIn.status, 200); const next = await signedIn.json();
    const logout = await post(f.base, '/auth/logout', {}, next.access_token);
    assert.equal(logout.status, 200); const ack = await logout.json(); matches('Ack', ack); assert.equal(ack.state, 'revoked');
    assert.equal((await me(f.base, next.access_token)).status, 401);
    assert.equal((await post(f.base, '/auth/refresh', { refresh_token: next.refresh_token })).status, 401);
    for (const canary of [password, account.email, account.email.toLowerCase(), first.access_token, first.refresh_token]) assert.ok(!f.logs.text().includes(canary));
    assert.ok(f.logs.records().some(x => x.route === '/v1/auth/register'));
  } finally { await f.close(); }
});
test('unknown/wrong/suspended accounts share safe login errors; duplicate registration is atomic', async () => {
  const f = await databaseFixture(secret);
  try {
    await post(f.base, '/auth/register', account);
    assert.equal((await post(f.base, '/auth/register', account)).status, 400);
    assert.equal((await f.pool.query('SELECT count(*)::int AS n FROM users')).rows[0].n, 1);
    const unknown = await post(f.base, '/auth/login', { email: 'unknown@example.test', password });
    const wrong = await post(f.base, '/auth/login', { email: account.email, password: 'a wrong PASSWORD_CANARY phrase' });
    await f.pool.query("UPDATE users SET status='suspended'");
    const locked = await post(f.base, '/auth/login', { email: account.email, password });
    for (const response of [unknown,wrong,locked]) {
      assert.equal(response.status, 401); const body = await response.json();
      assert.equal(body.code, 'UNAUTHENTICATED'); assert.equal(body.message, 'Không thể xác thực. Vui lòng đăng nhập lại.');
      assert.equal(body.correlation_id, response.headers.get('x-request-id'));
    }
  } finally { await f.close(); }
});
test('concurrent refresh detects reuse and revokes only that family; expiry and signature cannot be bypassed', async () => {
  const f = await databaseFixture(secret);
  try {
    const first = await (await post(f.base, '/auth/register', account)).json();
    const second = await (await post(f.base, '/auth/login', { email: account.email, password })).json();
    const responses = await Promise.all([1,2].map(() => post(f.base, '/auth/refresh', { refresh_token: first.refresh_token })));
    assert.deepEqual(responses.map(r => r.status).sort(), [200,401]);
    const won = await responses.find(r => r.status === 200)!.json();
    assert.equal((await me(f.base, won.access_token)).status, 401);
    assert.equal((await me(f.base, second.access_token)).status, 200);
    assert.equal((await me(f.base, second.access_token + 'bad')).status, 401);
    const expired = await new SignJWT({ sid: '00000000-0000-4000-8000-000000000001' }).setProtectedHeader({ alg: 'HS256' }).setSubject(first.user.id)
      .setIssuer('dvqb-api').setAudience('dvqb-mobile').setIssuedAt().setExpirationTime(1).sign(new TextEncoder().encode(secret));
    assert.equal((await me(f.base, expired)).status, 401);
    await f.pool.query("UPDATE sessions SET expires_at=now()-interval '1 minute' WHERE revoked_at IS NULL");
    assert.equal((await me(f.base, second.access_token)).status, 401);
    assert.equal((await post(f.base, '/auth/refresh', { refresh_token: second.refresh_token })).status, 401);
  } finally { await f.close(); }
});
test('auth rejects extra privilege fields, limits attempts and permits configured web preflight', async () => {
  const f = await databaseFixture(secret);
  try {
    assert.equal((await post(f.base, '/auth/register', { ...account, admin_permissions: ['*'] })).status, 400);
    assert.equal((await post(f.base, '/auth/register', { ...account, password: 'too-short' })).status, 400);
    assert.equal((await post(f.base, '/auth/refresh', { refresh_token: 'invalid' })).status, 400);
    const options = await fetch(f.base + '/auth/login', { method: 'OPTIONS', headers: { Origin: 'http://localhost', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,authorization' } });
    assert.equal(options.status, 204); assert.match(options.headers.get('access-control-allow-headers')!, /Authorization/);
    for (let i = 0; i < 7; i++) await post(f.base, '/auth/login', {});
    const limited = await post(f.base, '/auth/login', {});
    assert.equal(limited.status, 429); assert.ok(Number(limited.headers.get('retry-after')) > 0);
    assert.equal((await limited.json()).code, 'RATE_LIMITED');
    assert.equal((await me(f.base, 'bad')).status, 401);
  } finally { await f.close(); }
});
