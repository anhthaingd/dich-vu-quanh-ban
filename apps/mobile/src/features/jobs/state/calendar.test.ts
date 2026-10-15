import { businessDay, jobsByDay, loadCalendarJobs, monthCells, shiftMonth } from './calendar';
import { job } from '../../../../test/helpers/work';

test('calendar uses Hanoi midnight, leap days, Monday grid and stable time ordering without changing job states', () => {
  expect(businessDay('2026-10-15T17:00:00Z')).toBe('2026-10-16');
  expect(businessDay('2026-10-15T16:59:59Z')).toBe('2026-10-15');
  expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  const leap = monthCells('2028-02');
  expect(leap.filter(Boolean)).toHaveLength(29); expect(leap.length % 7).toBe(0);
  expect(monthCells('2026-06')[0]).toBe('2026-06-01');
  const early = {...job, id: 'a', scheduled_at: '2026-10-15T17:00:00Z', state: 'completed' as const};
  const later = {...job, id: 'b', scheduled_at: '2026-10-16T03:00:00Z', state: 'stopped' as const};
  const groups = jobsByDay([later, {...job, scheduled_at: null}, early]);
  expect(groups.size).toBe(1); expect(groups.get('2026-10-16')).toEqual([early, later]);
});
test('calendar reads every page, keeps newer duplicates and rejects partial or looping results', async () => {
  const read = jest.fn().mockResolvedValueOnce({items: [{...job, version: 2}], next_cursor: 'next'})
    .mockResolvedValueOnce({items: [job, {...job, id: 'second'}], next_cursor: null});
  expect(await loadCalendarJobs(read, () => true)).toEqual([{...job, version: 2}, {...job, id: 'second'}]);
  expect(read.mock.calls).toEqual([[undefined], ['next']]);
  await expect(loadCalendarJobs(jest.fn().mockResolvedValue({items: [job], next_cursor: 'loop'}), () => true)).rejects.toMatchObject({code: 'INVALID_RESPONSE'});
  await expect(loadCalendarJobs(jest.fn().mockResolvedValueOnce({items: [job], next_cursor: 'next'}).mockRejectedValueOnce(Error('offline')), () => true)).rejects.toThrow('offline');
});
test('calendar abandons a stale scope before loading another page or publishing data', async () => {
  let active = true;
  const read = jest.fn().mockImplementation(async () => {active = false; return {items: [job], next_cursor: 'next'};});
  expect(await loadCalendarJobs(read, () => active)).toBeNull(); expect(read).toHaveBeenCalledTimes(1);
  expect(await loadCalendarJobs(read, () => false)).toBeNull(); expect(read).toHaveBeenCalledTimes(1);
});
