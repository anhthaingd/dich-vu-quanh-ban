import { Writable } from 'node:stream';
import { AppLog } from '../../src/logging/logger.js';
export function captureLogs() {
  const lines: string[] = [];
  const stream = new Writable({ write(chunk, _encoding, done) { lines.push(chunk.toString()); done(); } });
  const log = new AppLog(stream, 'debug', 'test');
  return { log, text: () => lines.join(''), records: () => lines.join('').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) };
}
