import { AccountCollection } from './account-collection';
import { ApiError } from '../../../lib/http/api-error';
import { authFixture, session } from '../../../../test/helpers/auth';
test('pagination merges identity, reset replaces and follows pages to reload an editor',async()=>{
  const load=jest.fn().mockResolvedValueOnce({items:[{id:'1'}],next_cursor:'a'}).mockResolvedValueOnce({items:[{id:'1'},{id:'2'}],next_cursor:null});
  const c=new AccountCollection(load);await c.load();await c.load(true);expect(c.getSnapshot().items).toEqual([{id:'1'},{id:'2'}]);expect(load.mock.calls[1]).toEqual(['a']);
  load.mockResolvedValueOnce({items:[{id:'1'}],next_cursor:'a'}).mockResolvedValueOnce({items:[{id:'3'}],next_cursor:null});await c.load(false,'3');expect(c.getSnapshot().items).toEqual([{id:'1'},{id:'3'}]);
});
test('lost response retains exact operation/key; no double submit or reload until retry settles',async()=>{
  const load=jest.fn().mockResolvedValue({items:[],next_cursor:null});const c=new AccountCollection(load);
  const work=jest.fn().mockRejectedValueOnce(new ApiError('NETWORK')).mockResolvedValueOnce({});
  expect(await c.perform(work)).toBe(false);await c.load();expect(load).not.toHaveBeenCalled();
  const other=jest.fn();expect(await c.perform(other)).toBe(true);expect(other).not.toHaveBeenCalled();expect(work.mock.calls[0]).toEqual(work.mock.calls[1]);expect(c.getSnapshot().pending).toBe(false);
  expect(await c.perform()).toBe(false);
});
test('failed reload after commit never resends write; conflicts allow explicit refresh',async()=>{
  const load=jest.fn().mockRejectedValueOnce(new ApiError('NETWORK')).mockResolvedValue({items:[],next_cursor:null});const c=new AccountCollection(load);
  const work=jest.fn().mockResolvedValue({});expect(await c.perform(work)).toBe(true);expect(c.getSnapshot()).toMatchObject({saved:true,pending:false,error:'NETWORK'});await c.load();expect(work).toHaveBeenCalledTimes(1);
  await c.perform(async()=>{throw new ApiError('VERSION_CONFLICT');});expect(c.getSnapshot()).toMatchObject({pending:false,error:'VERSION_CONFLICT'});await c.load();expect(c.getSnapshot().error).toBeNull();
});
test('load failure, busy races and forbidden mutation are reported without unhandled rejection',async()=>{
  let release!: (value:{items:{id:string}[];next_cursor:null})=>void;const c=new AccountCollection(()=>new Promise<{items:{id:string}[];next_cursor:null}>(r=>{release=r;}));
  const pending=c.load();await c.load();expect(await c.perform(jest.fn())).toBe(false);release({items:[],next_cursor:null});await pending;
  expect(await c.perform(async()=>{throw new ApiError('FORBIDDEN');})).toBe(false);expect(c.getSnapshot().pending).toBe(false);
});
test('account requests refresh once with same mutation and self revoke clears secure storage',async()=>{
  const f=authFixture('saved');await f.manager.restore();f.accounts.archiveAddress.mockRejectedValueOnce(new ApiError('UNAUTHENTICATED')).mockResolvedValue({id:'x',version:2,state:'archived'});
  await f.manager.archiveAddress(session.user.id,'x','same-key');expect(f.accounts.archiveAddress.mock.calls.map(x=>x.slice(1))).toEqual([['x','same-key'],['x','same-key']]);
  f.accounts.revokeSession.mockResolvedValue({id:'family',version:1,state:'revoked'});await f.manager.revokeSession(session.user.id,'family',true,'key');expect(f.manager.getSnapshot().phase).toBe('anonymous');expect(f.storage.clear).toHaveBeenCalled();
  await expect(f.manager.listSessions(session.user.id)).rejects.toMatchObject({code:'UNAUTHENTICATED'});
});
