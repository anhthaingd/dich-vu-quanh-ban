import {createNotificationsApi,isNotice,isSettings} from './notifications-api';
const settings={message_push:true,call_push:true,service_push:true,reminder_push:false};
test('notification adapter validates boundaries and sends account settings and read retry keys',async()=>{
 const transport=jest.fn().mockResolvedValue(new Response(JSON.stringify(settings))),api=createNotificationsApi('http://localhost/v1',transport);
 expect(await api.save('token',settings,'key')).toEqual(settings);expect(transport.mock.calls[0][1].headers['Idempotency-Key']).toBe('key');expect(JSON.parse(transport.mock.calls[0][1].body)).toEqual(settings);
 transport.mockResolvedValue(new Response(JSON.stringify({id:'notice',state:'read'})));await api.read('token','notice','key2');expect(transport.mock.calls[1][0]).toContain('/me/notifications/notice/read');
 expect(isSettings({...settings,reminder_push:undefined})).toBe(false);expect(isNotice({id:'n',kind:'job',resource_ref:{job_id:4},read_at:null,created_at:'2026-10-14T00:00:00Z'})).toBe(false);
 transport.mockResolvedValue(new Response(JSON.stringify({items:[{id:'n'}],next_cursor:null})));await expect(api.list('token')).rejects.toMatchObject({code:'INVALID_RESPONSE'});
});
