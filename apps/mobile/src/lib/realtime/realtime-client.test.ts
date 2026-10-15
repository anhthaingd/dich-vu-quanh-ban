import {RealtimeClient,type Signal} from './realtime-client';
import {io} from 'socket.io-client';
jest.mock('socket.io-client',()=>({io:jest.fn()}));
function fake(){
 const handlers=new Map<string,(...args:unknown[])=>void>();
 const s={on:jest.fn(),removeAllListeners:jest.fn(()=>handlers.clear()),disconnect:jest.fn(),connect:jest.fn(),emit:jest.fn(),timeout:jest.fn(),fire:(n:string,...args:unknown[])=>handlers.get(n)?.(...args)};
 s.on.mockImplementation((n,f)=>{handlers.set(n,f);return s;});s.timeout.mockReturnValue(s);return s;
}
beforeEach(()=>{jest.useFakeTimers();jest.clearAllMocks();});afterEach(()=>jest.useRealTimers());
test('listeners precede connect, duplicate IDs collapse, subscriptions ACK triggers recovery and background tears down',()=>{
 const s=fake();jest.mocked(io).mockReturnValue(s as never);const c=new RealtimeClient('https://example.test/v1',true),signals:Signal[]=[];c.listen(e=>signals.push(e));
 c.setSession({owner:'a',token:'SECRET',expiresAt:Date.now()+900000});expect(s.on.mock.invocationCallOrder[0]).toBeLessThan(s.connect.mock.invocationCallOrder[0]);
 const unwatch=c.watch({type:'conversation',id:'room'});s.fire('connect');expect(c.connected).toBe(true);
 const [event,payload,ack]=s.emit.mock.calls[0];expect(event).toBe('subscribe');expect(payload).toMatchObject({type:'conversation',id:'room'});ack(null,{ok:true});
 const e={event_id:'id',type:'conversation.message_created.v1',aggregate_version:1,data:{conversation_id:'room'}};s.fire('domain.event',e);s.fire('domain.event',e);expect(signals.filter(x=>x.kind==='event')).toHaveLength(1);
 unwatch();expect(s.emit).toHaveBeenLastCalledWith('unsubscribe',expect.any(Object),expect.any(Function));c.setForeground(false);expect(s.disconnect).toHaveBeenCalled();expect(c.connected).toBe(false);c.dispose();expect(jest.getTimerCount()).toBe(0);
});
test('rotation cancels old callbacks and dedupe is account scoped; bounded retry and expiry use auth callback',async()=>{
 const first=fake(),next=fake();jest.mocked(io).mockReturnValueOnce(first as never).mockReturnValue(next as never);const c=new RealtimeClient('https://example.test/v1',true);let signals=0;c.listen(()=>signals++);
 c.setSession({owner:'a',token:'one',expiresAt:Date.now()+100});const refresh=jest.fn(async()=>{c.setSession({owner:'a',token:'two',expiresAt:Date.now()+900000});});c.setRefresh(refresh);
 await jest.advanceTimersByTimeAsync(1000);expect(refresh).toHaveBeenCalledTimes(1);expect(first.disconnect).toHaveBeenCalled();expect(io).toHaveBeenCalledTimes(2);
 next.fire('connect');c.setSession(null);next.fire('domain.event',{event_id:'late',type:'x',data:{},aggregate_version:1});expect(signals).toBe(1);expect(jest.getTimerCount()).toBe(0);c.dispose();
});
test('auth busy and network failures retry without parallel connection; disabled flag never connects',async()=>{
 const s=fake();jest.mocked(io).mockReturnValue(s as never);const c=new RealtimeClient('https://example.test/v1',true);const refresh=jest.fn().mockRejectedValueOnce(new Error('BUSY')).mockImplementation(async()=>c.setSession({owner:'a',token:'new',expiresAt:Date.now()+900000}));c.setRefresh(refresh);c.setSession({owner:'a',token:'old',expiresAt:Date.now()-1});await jest.advanceTimersByTimeAsync(5000);expect(refresh).toHaveBeenCalledTimes(2);expect(io).toHaveBeenCalledTimes(1);c.dispose();
 jest.mocked(io).mockClear();const disabled=new RealtimeClient('https://example.test/v1',false);disabled.setSession({owner:'a',token:'t',expiresAt:Date.now()+10000});expect(io).not.toHaveBeenCalled();disabled.dispose();
});

test('subscriptions wait for prior ACK; temporary rejection retries without revoking access',async()=>{
 const first=fake(),second=fake();jest.mocked(io).mockReturnValueOnce(first as never).mockReturnValue(second as never);
 const c=new RealtimeClient('https://example.test/v1',true),signals:Signal[]=[];c.listen(s=>signals.push(s));c.setSession({owner:'a',token:'t',expiresAt:Date.now()+900000});
 c.watch({type:'job',id:'one'});c.watch({type:'conversation',id:'two'});first.fire('connect');expect(first.emit).toHaveBeenCalledTimes(1);
 first.emit.mock.calls[0][2](null,{ok:true});expect(first.emit).toHaveBeenCalledTimes(2);
 first.emit.mock.calls[1][2](null,{ok:false,code:'RATE_LIMITED'});expect(signals.some(s=>s.kind==='revoked')).toBe(false);
 await jest.advanceTimersByTimeAsync(1000);second.fire('connect');expect(second.emit).toHaveBeenCalledTimes(1);
 second.emit.mock.calls[0][2](null,{ok:true});second.emit.mock.calls[1][2](null,{ok:false,code:'FORBIDDEN'});
 expect(signals).toContainEqual({kind:'revoked',resource:{type:'conversation',id:'two'}});c.dispose();expect(jest.getTimerCount()).toBe(0);
});
