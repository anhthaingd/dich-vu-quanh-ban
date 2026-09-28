import { createReadStream } from 'node:fs';
import { mkdir, open, readdir, realpath } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { resolve, join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function exportLogs({ directory = '.local/logs', output, requestId, from, to, maxBytes = 5 * 1024 * 1024 }) {
  if (!output || !Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > 5 * 1024 * 1024) throw new Error('Invalid export options');
  if (requestId && !uuid.test(requestId)) throw new Error('Invalid request ID');
  for (const date of [from,to]) if (date && !Number.isFinite(Date.parse(date))) throw new Error('Invalid timestamp');
  if (from && to && Date.parse(from) > Date.parse(to)) throw new Error('Invalid time range');
  const root = await realpath(directory);
  const names = (await readdir(root, { withFileTypes: true })).filter(x => x.isFile() && /^api-\d+\.\d+/.test(x.name)).map(x => x.name).sort();
  const requested = resolve(output);
  await mkdir(resolve(requested, '..'), { recursive: true });
  const target = join(await realpath(resolve(requested, '..')), basename(requested));
  if (target.startsWith(root + '/')) throw new Error('Export must be outside source directory');
  const out = await open(target, 'wx', 0o600);
  let bytes = 0, records = 0, truncated = false;
  try {
    outer: for (const name of names) {
      const input = createReadStream(join(root, name));
      const lines = createInterface({ input, crlfDelay: Infinity });
      try {
        for await (const line of lines) {
          if (!line || Buffer.byteLength(line) > 2048) continue;
          let entry; try { entry = JSON.parse(line); } catch { continue; }
          if (!entry.timestamp || !Number.isFinite(Date.parse(entry.timestamp)) || !['api','mobile'].includes(entry.service)) continue;
          if (requestId && entry.request_id !== requestId && entry.client_request_id !== requestId) continue;
          if (from && Date.parse(entry.timestamp) < Date.parse(from) || to && Date.parse(entry.timestamp) > Date.parse(to)) continue;
          // Copy only the schema's safe scalar diagnostics; never export arbitrary fields/messages.
          const safe = { timestamp: new Date(entry.timestamp).toISOString(), service: entry.service };
          for (const key of ['request_id','client_request_id']) if (typeof entry[key] === 'string' && uuid.test(entry[key])) safe[key] = entry[key];
          if (['debug','info','warn','error','fatal'].includes(entry.level)) safe.level = entry.level;
          if (/^(app\.(started|stopped|start_failed)|http\.(completed|aborted|exception)|db\.(completed|slow|unavailable|operation_failed|migration.completed|seed.completed)|framework\.(message|error))$/.test(entry.event)) safe.event = entry.event;
          for (const key of ['status_code','duration_ms']) if (typeof entry[key] === 'number' && Number.isFinite(entry[key]) && entry[key] >= 0 && entry[key] <= 86400000) safe[key] = entry[key];
          const text = JSON.stringify(safe) + '\n'; const size = Buffer.byteLength(text);
          if (bytes + size > maxBytes) { truncated = true; break outer; }
          await out.writeFile(text); bytes += size; records++;
        }
      } finally { lines.close(); input.destroy(); }
    }
  } finally { await out.close(); }
  return { bytes, records, truncated };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [output, requestId, from, to] = process.argv.slice(2);
  try { console.log(JSON.stringify(await exportLogs({ output, requestId, from, to }))); }
  catch { console.error('Diagnostic export failed: check arguments, permissions and destination (must be new).'); process.exitCode = 1; }
}
