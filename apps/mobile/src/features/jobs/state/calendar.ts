import { ApiError } from '../../../lib/http/api-error';
import type { Job, Page } from '../models';

// Business dates never depend on the device timezone or the chosen language.
export function businessDay(value: string | Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function shiftMonth(month: string, delta: number): string {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year, number - 1 + delta, 1)).toISOString().slice(0, 7);
}
export function monthCells(month: string): (string | null)[] {
  const first = new Date(`${month}-01T00:00:00Z`);
  const offset = (first.getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from({length: offset}, () => null);
  for (let day = 1; day <= length; day++) cells.push(`${month}-${String(day).padStart(2, '0')}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}
export function jobsByDay(items: Job[]): Map<string, Job[]> {
  const groups = new Map<string, Job[]>();
  for (const job of items) {
    if (!job.scheduled_at) continue;
    const day = businessDay(job.scheduled_at);
    groups.set(day, [...(groups.get(day) ?? []), job]);
  }
  for (const group of groups.values()) group.sort((a, b) => Date.parse(a.scheduled_at!) - Date.parse(b.scheduled_at!) || a.id.localeCompare(b.id));
  return groups;
}
// A partial page is not a calendar. Publish only after every authorized page succeeds.
export async function loadCalendarJobs(read: (cursor?: string) => Promise<Page<Job>>, active: () => boolean): Promise<Job[] | null> {
  const found = new Map<string, Job>(), seen = new Set<string>();
  let cursor: string | undefined;
  do {
    if (!active()) return null;
    const page = await read(cursor);
    if (!active()) return null;
    for (const job of page.items) {
      const old = found.get(job.id);
      if (!old || job.version >= old.version) found.set(job.id, job);
    }
    cursor = page.next_cursor ?? undefined;
    if (cursor && seen.has(cursor)) throw new ApiError('INVALID_RESPONSE');
    if (cursor) seen.add(cursor);
  } while (cursor);
  return [...found.values()];
}
