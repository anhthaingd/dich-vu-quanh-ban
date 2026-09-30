import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireTestDatabase } from './native-options.mjs';
test('native fault injection is restricted to the local test database', () => {
  assert.equal(requireTestDatabase('postgresql://localhost:55433/dvqb_test'), 'postgresql://localhost:55433/dvqb_test');
  for (const url of ['postgresql://localhost:55432/dvqb_local', 'postgresql://production.example/dvqb_test', 'https://localhost/dvqb_test']) {
    assert.throws(() => requireTestDatabase(url), /local dvqb_test/);
  }
});
