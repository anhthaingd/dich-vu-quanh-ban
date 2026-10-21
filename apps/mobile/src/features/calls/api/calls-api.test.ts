import {createCallsApi,isCall} from './calls-api';
const call={id:'call',job_id:'job',conversation_id:'room',caller_id:'caller',recipient_id:'recipient',state:'accepted',version:2,created_at:'2026-10-21T00:00:00Z',answered_at:'2026-10-21T00:00:01Z',ended_at:null,ring_until:'2026-10-21T00:00:45Z'};
const response=(body:unknown)=>({ok:true,status:200,json:async()=>body});
test('call client validates token isolation endpoints, payloads and retry headers',async()=>{
 const transport=jest.fn().mockResolvedValue(response(call));const api=createCallsApi('http://localhost/v1/',transport);
 await api.create('test','job','recipient','retry-key');expect(transport).toHaveBeenLastCalledWith('http://localhost/v1/calls',expect.objectContaining({method:'POST',body:JSON.stringify({job_id:'job',recipient_id:'recipient'}),headers:expect.objectContaining({'Idempotency-Key':'retry-key',Authorization:'Bearer test'})}));
 await api.action('test',call as Parameters<typeof api.action>[1],'end','same-key');expect(transport.mock.calls.at(-1)![0]).toContain('/calls/call/actions');expect(JSON.parse(transport.mock.calls.at(-1)![1].body)).toEqual({expected_version:2,action:'end'});
 await api.get('test','call');expect(transport.mock.calls.at(-1)![1].method).toBe('GET');await api.heartbeat('test','call');expect(transport.mock.calls.at(-1)![0]).toContain('/heartbeat');
 transport.mockResolvedValueOnce(response({call_id:'call',url:'ws://127.0.0.1:7880',token:'local-test-token-long-enough',expires_at:'2026-10-21T00:00:30Z'}));await api.media('test','call');expect(transport.mock.calls.at(-1)![1].headers['Idempotency-Key']).toBeUndefined();
});
test('history encodes scope/cursor; invalid call, target and credential responses never reach UI',async()=>{
 const transport=jest.fn().mockResolvedValue(response({items:[call],next_cursor:null}));const api=createCallsApi('http://localhost/v1',transport);await api.list('test',{active:true,conversation_id:'room',cursor:'a+b'});expect(transport.mock.calls.at(-1)![0]).toContain('active=true&conversation_id=room&cursor=a%2Bb');
 transport.mockResolvedValueOnce(response({items:[{user_id:'u',display_name:'Demo',role:'contact'}]}));expect((await api.targets('test','job')).items[0].role).toBe('contact');
 for(const body of [{...call,state:'recording'},{...call,version:0},{...call,created_at:'bad'}])expect(isCall(body)).toBe(false);
 transport.mockResolvedValueOnce(response({...call,state:'unknown'}));await expect(api.get('test','call')).rejects.toMatchObject({code:'INVALID_RESPONSE'});
 transport.mockResolvedValueOnce(response({items:[{user_id:'u',display_name:'DEMO',role:'admin'}]}));await expect(api.targets('test','job')).rejects.toMatchObject({code:'INVALID_RESPONSE'});
 transport.mockResolvedValueOnce(response({call_id:'call',url:'https://wrong',token:'too-short',expires_at:'bad'}));await expect(api.media('test','call')).rejects.toMatchObject({code:'INVALID_RESPONSE'});
 await expect(createCallsApi('bad').get('test','call')).rejects.toMatchObject({code:'CONFIG'});
});
