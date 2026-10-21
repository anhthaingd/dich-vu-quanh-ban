import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { databaseFixture } from '../helpers/database.js';
import { AuthService } from '../../src/modules/auth/auth.service.js';
const secret = 'profile-test-only-'.repeat(4);
async function signup(base: string, email = 'profile@example.test') {
  const r = await fetch(base + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'test-only-long-password', display_name: 'Original' }) });
  assert.equal(r.status, 201); return r.json();
}
function patch(base: string, token: string, body: unknown, key: string = randomUUID()) {
  return fetch(base + '/me', { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(body) });
}
test('profile uses real version, replay is atomic, key scope is actor and no private names enter logs', async () => {
  const f = await databaseFixture(secret);
  try {
    const first = await signup(f.base), second = await signup(f.base, 'other@example.test');
    assert.equal(first.user.version, 1);
    const key = randomUUID(), input = { display_name: 'PROFILE_NAME_CANARY', expected_version: 1 };
    const results = await Promise.all([patch(f.base, first.access_token, input, key), patch(f.base, first.access_token, input, key)]);
    assert.deepEqual(results.map(x => x.status), [200, 200]);
    const one = await results[0].json(), replay = await results[1].json();
    assert.deepEqual(one, replay); assert.equal(one.version, 2); assert.equal(one.email_verified, false);
    assert.equal(results[0].headers.get('cache-control'), 'no-store');
    const conflict = await patch(f.base, first.access_token, { ...input, display_name: 'Different' }, key);
    assert.equal(conflict.status, 409); assert.equal((await conflict.json()).code, 'IDEMPOTENCY_MISMATCH');
    assert.equal((await patch(f.base, second.access_token, input, key)).status, 200);
    assert.equal((await f.pool.query('SELECT count(*)::int n FROM idempotency_keys')).rows[0].n, 2);
    const saved = await (await fetch(f.base + '/me', { headers: { Authorization: `Bearer ${first.access_token}` } })).json();
    assert.equal(saved.version, 2); assert.equal(saved.display_name, input.display_name);
    const refresh = await (await fetch(f.base + '/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: first.refresh_token }) })).json();
    assert.equal(refresh.user.version, 2);
    assert.ok(!f.logs.text().includes(input.display_name)); assert.ok(!f.logs.text().includes(first.access_token));
    const options = await fetch(f.base + '/me', { method: 'OPTIONS', headers: { Origin: 'http://localhost', 'Access-Control-Request-Method': 'PATCH', 'Access-Control-Request-Headers': 'authorization,idempotency-key,content-type' } });
    assert.equal(options.status, 204); assert.match(options.headers.get('access-control-allow-methods')!, /PATCH/); assert.match(options.headers.get('access-control-allow-headers')!, /Idempotency-Key/);
  } finally { await f.close(); }
});
test('two editors cannot overwrite, and old-key replay cannot revert a later edit', async () => {
  const f = await databaseFixture(secret);
  try {
    const account = await signup(f.base), key = randomUUID();
    const input = { expected_version: 1, display_name: 'First' };
    assert.equal((await patch(f.base, account.access_token, input, key)).status, 200);
    const stale = await patch(f.base, account.access_token, { expected_version: 1, display_name: 'Stale' });
    assert.equal(stale.status, 409); assert.equal((await stale.json()).code, 'VERSION_CONFLICT');
    const races = await Promise.all(['Second', 'Third'].map(display_name => patch(f.base, account.access_token, { expected_version: 2, display_name })));
    assert.deepEqual(races.map(x => x.status).sort(), [200, 409]);
    const replay = await (await patch(f.base, account.access_token, input, key)).json();
    assert.equal(replay.version, 2);
    const db = (await f.pool.query('SELECT display_name,version FROM users')).rows[0];
    assert.equal(db.version, 3); assert.notEqual(db.display_name, 'First');
  } finally { await f.close(); }
});
test('profile rejects forged owner/privileges, bad fields/keys and revoked/suspended sessions, including replay', async () => {
  const f = await databaseFixture(secret);
  try {
    const a = await signup(f.base), key = randomUUID(), input = { expected_version: 1, display_name: 'New' };
    for (const bad of [null, [], {}, { ...input, user_id: randomUUID() }, { ...input, email_verified: true }, { ...input, locale: 'fr' }, { ...input, expected_version: 0 }, { ...input, expected_version: 1.2 }, { ...input, display_name: ' ' }, { ...input, display_name: 'x'.repeat(101) }, { ...input, display_name: 'bad\nname' }]) {
      assert.equal((await patch(f.base, a.access_token, bad)).status, 400);
    }
    assert.equal((await patch(f.base, a.access_token, input, 'bad-key')).status, 400);
    assert.equal((await patch(f.base, 'forged', input)).status, 401);
    assert.equal((await patch(f.base, a.access_token, input, key)).status, 200);
    await f.pool.query("UPDATE users SET status='suspended'");
    assert.equal((await patch(f.base, a.access_token, input, key)).status, 401);
    await f.pool.query("UPDATE users SET status='active'");
    await f.pool.query('UPDATE sessions SET revoked_at=now()');
    assert.equal((await patch(f.base, a.access_token, input, key)).status, 401);
    assert.equal((await f.pool.query('SELECT version FROM users')).rows[0].version, 2);
  } finally { await f.close(); }
});
test('failed idempotency persistence rolls back profile; same key succeeds after recovery', async () => {
  const f = await databaseFixture(secret);
  try {
    const a = await signup(f.base), key = randomUUID(), input = { expected_version: 1, display_name: 'Recovered' };
    await f.pool.query("ALTER TABLE idempotency_keys ADD CONSTRAINT fail_profile_test CHECK (operation <> 'editMe')");
    assert.equal((await patch(f.base, a.access_token, input, key)).status, 500);
    assert.deepEqual((await f.pool.query('SELECT display_name,version FROM users')).rows[0], { display_name: 'Original', version: 1 });
    assert.equal((await f.pool.query('SELECT count(*)::int n FROM idempotency_keys')).rows[0].n, 0);
    await f.pool.query('ALTER TABLE idempotency_keys DROP CONSTRAINT fail_profile_test');
    assert.equal((await patch(f.base, a.access_token, input, key)).status, 200);
  } finally { await f.close(); }
});
test('session revoked after the initial check cannot mutate while waiting for user lock', async () => {
  const f = await databaseFixture(secret);
  try {
    const a = await signup(f.base), auth = f.app.get(AuthService), original = auth.authenticate.bind(auth);
    let entered!: () => void, release!: () => void;
    const checked = new Promise<void>(resolve => { entered = resolve; });
    const resume = new Promise<void>(resolve => { release = resolve; });
    let first = true;
    auth.authenticate = async (...args) => {
      const actor = await original(...args);
      if (first) { first = false; entered(); await resume; }
      return actor;
    };
    const pending = patch(f.base, a.access_token, { expected_version: 1, display_name: 'Forbidden' });
    await checked;
    await f.pool.query('UPDATE sessions SET revoked_at=now()'); release();
    assert.equal((await pending).status, 401);
    assert.equal((await f.pool.query('SELECT version FROM users')).rows[0].version, 1);
    assert.equal((await f.pool.query('SELECT count(*)::int n FROM idempotency_keys')).rows[0].n, 0);
  } finally { await f.close(); }
});
