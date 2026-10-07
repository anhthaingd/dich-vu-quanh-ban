import {createJobsApi,isJob} from './jobs-api';
import {createChatApi,isMessage,isConversation} from '../../chat/api/chat-api';
import {job,message,room} from '../../../../test/helpers/work';
const response=(value:unknown)=>({ok:true,status:200,headers:new Headers(),json:async()=>value});
test('job and chat response boundaries reject corrupt state, location, sequence and actor fields',()=>{
 expect(isJob(job)).toBe(true);expect(isMessage(message)).toBe(true);expect(isConversation(room)).toBe(true);
 for(const bad of [null,[],{...job,state:'unknown'},{...job,version:0},{...job,eta:'bad date'},{...job,address:{text:'x',point:{latitude:91,longitude:0}}},{...job,skills:[{skill_id:'x',schema_version:0}]},{...job,allowed_actions:['pay']},{...job,assigned_member_id:12}])expect(isJob(bad)).toBe(false);
 for(const bad of [null,{...message,sequence:0},{...message,sender_id:{}},{...message,created_at:'bad'}])expect(isMessage(bad)).toBe(false);
 for(const bad of [null,{...room,kind:'public'},{...room,unread:-1},{...room,job_ids:[4]}])expect(isConversation(bad)).toBe(false);
});
test('job API authenticates, encodes pagination and retains idempotency/version on actions',async()=>{
 const transport=jest.fn().mockResolvedValue(response(job)),api=createJobsApi('http://local/v1/',transport);
 const input={partner_id:'partner',skills:job.skills,service_mode:job.service_mode,address:job.address,time_mode:job.time_mode};
 await api.create('token',input,'create-key');expect(transport).toHaveBeenLastCalledWith('http://local/v1/jobs',expect.objectContaining({method:'POST',body:JSON.stringify(input),headers:expect.objectContaining({Authorization:'Bearer token','Idempotency-Key':'create-key'})}));
 await api.get('token','job/1');expect(transport.mock.calls.at(-1)[0]).toBe('http://local/v1/jobs/job%2F1');
 await api.change('token','job','accept',{expected_version:1,eta:'2099-01-01T00:00:00Z'},'accept-key');expect(transport.mock.calls.at(-1)[0]).toBe('http://local/v1/jobs/job/accept');
 transport.mockResolvedValueOnce(response({job,conversation_id:'room'}));expect(await api.change('token','job','assignments',{expected_version:1,membership_id:'member'},'assign-key')).toEqual(job);
 transport.mockResolvedValue(response({items:[job],next_cursor:null}));await api.list('token','partner','a/b');expect(transport.mock.calls.at(-1)[0]).toBe('http://local/v1/jobs?partner_id=partner&cursor=a%2Fb');await api.list('token');
 transport.mockResolvedValue(response({items:[{id:'member',user_id:'user',display_name:'DEMO',active:true,is_owner:true,version:1,permissions:['jobs.assign']}],next_cursor:null}));await api.members('token','partner','a/b');expect(transport.mock.calls.at(-1)[0]).toBe('http://local/v1/partners/partner/members?cursor=a%2Fb');await api.members('token','partner');
 transport.mockResolvedValueOnce(response({items:[job],next_cursor:4}));await expect(api.list('token')).rejects.toMatchObject({code:'INVALID_RESPONSE'});
 await expect(createJobsApi(undefined,transport).get('token','job')).rejects.toMatchObject({code:'CONFIG'});
});
test('chat API sends client message ID and read watermark; rejects mismatched read ACK',async()=>{
 const transport=jest.fn().mockResolvedValue(response(room)),api=createChatApi('http://local/v1',transport);
 await api.open('token',{partner_id:'partner'},'open-key');expect(transport.mock.calls.at(-1)[1].headers).toMatchObject({Authorization:'Bearer token','Idempotency-Key':'open-key'});
 transport.mockResolvedValue(response({items:[room],next_cursor:null}));await api.list('token','a/b');expect(transport.mock.calls.at(-1)[0]).toBe('http://local/v1/conversations?cursor=a%2Fb');await api.list('token');
 transport.mockResolvedValue(response({items:[message],next_cursor:null}));await api.messages('token','room/1',3,'a/b');expect(transport.mock.calls.at(-1)[0]).toBe('http://local/v1/conversations/room%2F1/messages?after_sequence=3&cursor=a%2Fb');await api.messages('token','room');
 transport.mockResolvedValue(response(message));await api.send('token','room',{client_message_id:'stable',body:'DEMO'},'send-key');expect(JSON.parse(transport.mock.calls.at(-1)[1].body)).toEqual({client_message_id:'stable',body:'DEMO'});
 transport.mockResolvedValueOnce(response({id:'room',state:'read'}));await api.read('token','room',3,'read-key');expect(transport.mock.calls.at(-1)[1]).toMatchObject({method:'PUT',body:JSON.stringify({last_sequence:3})});
 transport.mockResolvedValueOnce(response({id:'another-room',state:'read'}));await expect(api.read('token','room',3,'read-key')).rejects.toMatchObject({code:'INVALID_RESPONSE'});
 await expect(createChatApi(undefined,transport).list('token')).rejects.toMatchObject({code:'CONFIG'});
});
