import { SessionRevocation } from './session-revocation';
import { ApiError } from '../../../lib/http/api-error';
import type { LoginSession } from '../models';
const row = (id: string, is_current = false, state: LoginSession['state'] = 'active'): LoginSession => ({ id, is_current, state, version: 1, created_at: '2026-10-06T00:00:00Z', last_seen_at: null });
const page = (items: LoginSession[], next_cursor: string | null = null) => ({ items, next_cursor });
test('reads every page before confirmation, excludes current/expired/revoked, cancel sends nothing', async () => {
  const list = jest.fn().mockResolvedValueOnce(page([row('current', true), row('a')], 'next')).mockResolvedValueOnce(page([row('b'), row('old',false,'expired'),row('gone',false,'revoked')]));
  const revoke = jest.fn(); const batch = new SessionRevocation(list, revoke);
  const listener = jest.fn(); const unsubscribe = batch.subscribe(listener);
  await batch.run(); batch.cancel(); expect(revoke).not.toHaveBeenCalled();
  await batch.prepare(); expect(list.mock.calls).toEqual([[undefined], ['next']]);
  expect(batch.getSnapshot()).toMatchObject({phase:'confirm',total:2}); expect(revoke).not.toHaveBeenCalled();
  await batch.prepare(); expect(list).toHaveBeenCalledTimes(2);
  batch.cancel(); expect(batch.getSnapshot().phase).toBe('idle'); expect(listener).toHaveBeenCalled(); unsubscribe();
});
test('partial failure retries the identical key only for the unconfirmed target; no new logins included', async () => {
  const list = jest.fn().mockResolvedValue(page([row('current',true),row('a'),row('b'),row('c')]));
  const revoke = jest.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new ApiError('NETWORK')).mockResolvedValue({});
  const batch = new SessionRevocation(list,revoke); await batch.prepare(); await batch.run();
  expect(batch.getSnapshot()).toMatchObject({phase:'failed',completed:1,total:3,error:'NETWORK'});
  batch.cancel(); expect(batch.getSnapshot().phase).toBe('failed');
  list.mockResolvedValue(page([row('current',true),row('new')]));
  await batch.run(); expect(revoke.mock.calls.map(x=>x[0])).toEqual(['a','b','b','c']);
  expect(revoke.mock.calls[1]).toEqual(revoke.mock.calls[2]); expect(list).toHaveBeenCalledTimes(1);
  expect(batch.getSnapshot()).toMatchObject({phase:'done',completed:3,error:null});
  await batch.run(); expect(revoke).toHaveBeenCalledTimes(4);
  await batch.prepare(); expect(batch.getSnapshot()).toMatchObject({phase:'confirm',completed:0,total:1});
});
test('page failure never revokes a partial list and can restart preparation', async () => {
  const list = jest.fn().mockResolvedValueOnce(page([row('current',true),row('a')],'next')).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(page([row('current',true)]));
  const revoke=jest.fn();const batch=new SessionRevocation(list,revoke);await batch.prepare();
  expect(batch.getSnapshot()).toMatchObject({phase:'idle',error:'NETWORK'}); await batch.run();expect(revoke).not.toHaveBeenCalled();
  await batch.prepare();expect(batch.getSnapshot()).toMatchObject({phase:'done',total:0,error:null});
});
test.each([
  [page([row('a')]),'INVALID_RESPONSE'],
  [page([row('a',true),row('b',true)]),'INVALID_RESPONSE'],
  [page([row('a',true,'revoked')]),'INVALID_RESPONSE'],
  [page([row('current',true)],'loop'),'INVALID_RESPONSE'],
])('refuses an unsafe snapshot %#',async (result,code)=>{
  const batch=new SessionRevocation(jest.fn().mockResolvedValue(result),jest.fn());await batch.prepare();expect(batch.getSnapshot()).toMatchObject({phase:'idle',error:code});
});
test('deduplicates paginated families and retains the latest state',async()=>{
  const list=jest.fn().mockResolvedValueOnce(page([row('current',true),row('a')],'next')).mockResolvedValueOnce(page([row('a',false,'revoked'),row('b'),row('b')]));
  const revoke=jest.fn().mockResolvedValue({});const batch=new SessionRevocation(list,revoke);await batch.prepare();await batch.run();expect(revoke.mock.calls.map(x=>x[0])).toEqual(['b']);
});
test('ignores double confirmation and second preparation while running',async()=>{
  let finish!:()=>void;const revoke=jest.fn(()=>new Promise<void>(resolve=>{finish=resolve;}));
  const batch=new SessionRevocation(async()=>page([row('current',true),row('a')]),revoke);
  const prepare=batch.prepare();await batch.prepare();await prepare;
  const running=batch.run();await batch.run();await batch.prepare();expect(revoke).toHaveBeenCalledTimes(1);finish();await running;expect(batch.getSnapshot().completed).toBe(1);
});
test.each([new ApiError('UNAUTHENTICATED'), new Error('lost response')])('stops instead of claiming remaining revocations succeeded %#',async error=>{
  const revoke=jest.fn().mockRejectedValue(error);const batch=new SessionRevocation(async()=>page([row('current',true),row('a'),row('b')]),revoke);
  await batch.prepare();await batch.run();expect(batch.getSnapshot()).toMatchObject({phase:'failed',completed:0});expect(revoke).toHaveBeenCalledTimes(1);
});
