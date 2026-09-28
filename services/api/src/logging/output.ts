import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { once } from 'node:events';
import type { SonicBoom } from 'sonic-boom';
const roll = createRequire(import.meta.url)('pino-roll') as (options: Record<string, unknown>) => Promise<SonicBoom & { fd: number; destroyed: boolean }>;
export async function fileOutput(directory: string, onFailure: () => void, size = '10m') {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const stream = await roll({ file: join(directory, `api-${process.pid}`), size, limit: { count: 2 }, mkdir: false, mode: 0o600, maxLength: 65536, maxWrite: 2048 });
  let failed = false;
  const fail = () => { failed = true; onFailure(); };
  stream.on('error', fail); stream.on('drop', fail);
  if (stream.fd < 0) await once(stream, 'ready');
  if (failed) throw new Error('Log output unavailable');
  return {
    stream,
    write(line: string) { if (failed) throw new Error('Log output unavailable'); process.stdout.write(line); stream.write(line); },
    async close() { if (stream.destroyed) return; const closed = once(stream, 'close'); stream.end(); await closed; },
  };
}
