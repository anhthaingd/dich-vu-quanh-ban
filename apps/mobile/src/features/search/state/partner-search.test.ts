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
  expect(search.getSnapshot().criteria?.latitude).toBe(22);
  expect(api.search.mock.calls[0][2].aborted).toBe(true);
});
test('reset removes map criteria and pins and ignores the old in-flight response',async()=>{
 const {api,search}=fixture(),pending=deferred<unknown>();api.search.mockReturnValueOnce(pending.promise);
 const work=search.search(q);search.reset();pending.resolve({items:[{id:'old'}],next_cursor:null});await work;
 expect(search.getSnapshot()).toMatchObject({criteria:null,items:[],searched:false,next:null});
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

test('refresh keeps visible results and their map scope, and cannot append stale pages', async () => {
 const {api,search}=fixture(), oldPage=deferred<unknown>(), refresh=deferred<unknown>();
 api.search.mockResolvedValueOnce({items:[{id:'one'}],next_cursor:'old-cursor'}).mockReturnValueOnce(oldPage.promise).mockReturnValueOnce(refresh.promise);
 await search.search(q);
 const more=search.more();
 const nextQuery={...q,sort:'rating' as const,radius_m:5000};
 const changed=search.search(nextQuery);
 expect(search.getSnapshot()).toMatchObject({items:[{id:'one'}],criteria:q,busy:true,searched:true,next:null});
 oldPage.resolve({items:[{id:'stale-page'}],next_cursor:'old-next'});await more;
 expect(search.getSnapshot().items).toEqual([{id:'one'}]);
 refresh.resolve({items:[{id:'new-query'}],next_cursor:'new-cursor'});await changed;
 expect(search.getSnapshot()).toMatchObject({items:[{id:'new-query'}],criteria:nextQuery,next:'new-cursor',busy:false});
});

test('failed filter refresh preserves last results and retry uses newly selected criteria',async()=>{
 const {api,search}=fixture();
 api.search.mockResolvedValueOnce({items:[{id:'one'}],next_cursor:'old'}).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({items:[],next_cursor:null});
 await search.search(q);await search.search({...q,radius_m:5000});
 expect(search.getSnapshot()).toMatchObject({items:[{id:'one'}],error:'NETWORK',next:null,searched:true});
 await search.more();expect(api.search).toHaveBeenCalledTimes(2);
 await search.retry();expect(api.search.mock.calls[2][0]).toEqual({...q,radius_m:5000});
 expect(search.getSnapshot()).toMatchObject({items:[],error:null,criteria:{...q,radius_m:5000}});
});

test('returning to results resumes an interrupted filter refresh but not a completed search',async()=>{
 const {api,search}=fixture(),pending=deferred<unknown>();
 api.search.mockResolvedValueOnce({items:[{id:'visible'}],next_cursor:null}).mockReturnValueOnce(pending.promise).mockResolvedValueOnce({items:[{id:'updated'}],next_cursor:null});
 await search.search(q);await search.resume();expect(api.search).toHaveBeenCalledTimes(1);
 const changing=search.search({...q,sort:'rating'});search.cancel();
 expect(search.getSnapshot().items).toEqual([{id:'visible'}]);
 await search.resume();pending.resolve({items:[{id:'stale'}],next_cursor:null});await changing;
 expect(api.search).toHaveBeenCalledTimes(3);expect(search.getSnapshot().items).toEqual([{id:'updated'}]);
});

test('returning during pagination resumes the same cursor without dropping already loaded pages',async()=>{
 const {api,search}=fixture(),pending=deferred<unknown>();
 api.search.mockResolvedValueOnce({items:[{id:'one'}],next_cursor:'page-2'}).mockResolvedValueOnce({items:[{id:'two'}],next_cursor:'page-3'}).mockReturnValueOnce(pending.promise).mockResolvedValueOnce({items:[{id:'three'}],next_cursor:null});
 await search.search(q);await search.more();const more=search.more();search.cancel();await search.resume();
 pending.resolve({items:[{id:'late'}],next_cursor:null});await more;
 expect(api.search.mock.calls[3][1]).toBe('page-3');expect(search.getSnapshot().items).toEqual([{id:'one'},{id:'two'},{id:'three'}]);
});
