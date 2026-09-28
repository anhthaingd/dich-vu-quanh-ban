import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCoverage } from './coverage-gate.mjs';
const core = '/src/logging/logger.ts', app = '/src/main.ts';
function file(count = 1) { return { statementMap: { 0: { start: { line: 1 } } }, s: { 0: count }, b: { 0: [count] } }; }
test('coverage gate fails closed on missing report, missing source and uncovered branch', () => {
  assert.throws(() => checkCoverage('/src', {}, []), /Missing/);
  assert.throws(() => checkCoverage('/src', { [core]: file() }, [core,app]), /Missing/);
  assert.throws(() => checkCoverage('/src', { [core]: file(0), [app]: file() }, [core,app]), /below/);
  assert.throws(() => checkCoverage('/src', { [core]: { ...file(), b: { 0: [1,0] } }, [app]: file() }, [core,app]), /below/);
  assert.deepEqual(checkCoverage('/src', { [core]: file(), [app]: file() }, [core,app]).core, { lines: 100, branches: 100 });
});
