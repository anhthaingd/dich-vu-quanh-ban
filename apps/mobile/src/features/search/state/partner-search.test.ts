import { PartnerSearch } from './partner-search';
import type { PartnersApi } from '../../partners/api/partners-api';
const q = { latitude: 21, longitude: 105, radius_m: 10000 };
function fixture() {
  const api = { search: jest.fn() };
  return { api, search: new PartnerSearch(api as unknown as PartnersApi) };
}
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { resolve, promise };
}
test('late response cannot replace new location search even if transport ignores abort', async () => {
  const { api, search } = fixture(),
    old = deferred<unknown>();
  api.search
    .mockReturnValueOnce(old.promise)
    .mockResolvedValueOnce({ items: [{ id: 'new' }], next_cursor: null });
  const first = search.search(q);
  await search.search({ ...q, latitude: 22 });
  old.resolve({ items: [{ id: 'old' }], next_cursor: null });
  await first;
  expect(search.getSnapshot().items).toEqual([{ id: 'new' }]);
  expect(api.search.mock.calls[0][2].aborted).toBe(true);
});
test('deduplicates pages, retries read errors and rejects cursor loops', async () => {
  const { api, search } = fixture();
  api.search
    .mockResolvedValueOnce({ items: [{ id: 'one' }], next_cursor: 'next' })
    .mockResolvedValueOnce({
      items: [{ id: 'one' }, { id: 'two' }],
      next_cursor: 'next'
    });
  await search.search(q);
  await search.more();
  expect(search.getSnapshot().error).toBe('INVALID_RESPONSE');
  expect(search.getSnapshot().items).toEqual([{ id: 'one' }]);
  api.search.mockResolvedValueOnce({
    items: [{ id: 'one' }],
    next_cursor: 'next'
  });
  await search.retry();
  expect(search.getSnapshot().error).toBeNull();
  api.search.mockResolvedValueOnce({
    items: [{ id: 'one' }, { id: 'two' }],
    next_cursor: null
  });
  await search.more();
  expect(search.getSnapshot().items).toEqual([{ id: 'one' }, { id: 'two' }]);
});
test('cancel clears loading and ignores a response after leaving screen', async () => {
  const { api, search } = fixture(),
    pending = deferred<unknown>();
  api.search.mockReturnValue(pending.promise);
  const work = search.search(q);
  search.cancel();
  pending.resolve({ items: [{ id: 'old' }], next_cursor: null });
  await work;
  expect(search.getSnapshot()).toMatchObject({
    busy: false,
    searched: false,
    items: []
  });
});
