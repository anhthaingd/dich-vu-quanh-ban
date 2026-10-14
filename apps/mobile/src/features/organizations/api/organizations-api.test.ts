import {createOrganizationsApi} from './organizations-api';
const member={id:'m',user_id:'u',display_name:'DEMO',active:true,is_owner:false,permissions:[],version:1};
const membership={...member,partner_id:'p',partner_name:'DEMO',partner_kind:'company',left_at:null};
const invitation={id:'i',partner_id:'p',contact_masked:'w***@example.test',permissions:[],status:'pending',delivery_state:'queued',created_at:'2026-10-13T00:00:00Z',expires_at:'2026-10-20T00:00:00Z',version:1,replacement_id:null};
test('team adapter protects response boundary, sends scoped secrets only in bodies and retains mutation keys',async()=>{
 const transport=jest.fn(),api=createOrganizationsApi('http://localhost/v1/',transport);
 const reply=(v:unknown)=>transport.mockResolvedValueOnce({ok:true,status:200,json:async()=>v});
 reply({items:[membership],next_cursor:null});expect((await api.memberships('session','a+b')).items).toEqual([membership]);expect(transport.mock.calls.at(-1)[0]).toBe('http://localhost/v1/me/memberships?cursor=a%2Bb');
 reply({items:[invitation],next_cursor:null});await api.invitations('session','p');
 reply({id:'i',state:'pending',version:1});await api.invite('session','p','demo@example.test','invite-key');expect(JSON.parse(transport.mock.calls.at(-1)[1].body)).toEqual({contact:'demo@example.test',permissions:[]});
 reply(member);await api.accept('session','invite-secret','accept-key');expect(transport.mock.calls.at(-1)[1]).toMatchObject({method:'POST',body:JSON.stringify({token:'invite-secret'}),headers:{'Idempotency-Key':'accept-key'}});
 reply(invitation);await api.invitationChange('session','i','resend',1,'','resend-key');reply(invitation);await api.invitationChange('session','i','revoke',1,'DEMO','revoke-key');
 reply({membership_version:1,total:0,items:[],next_cursor:null});await api.preview('session','m','a+b');
 reply({id:'m',version:2,state:'left'});await api.leave('session','m',1,'DEMO','leave-key');reply(member);await api.remove('session','m',1,'DEMO','remove-key');
 reply({grant:'reauth-secret',expires_at:'2026-10-13T00:05:00Z'});await api.reauth('session','password-secret');
 reply(member);await api.grants('session','m',1,['jobs.assign'],'DEMO','reauth-secret','grant-key');expect(JSON.parse(transport.mock.calls.at(-1)[1].body)).toMatchObject({expected_version:1,reauth_grant:'reauth-secret',reason:'DEMO'});
 reply({partner_id:'p',membership_id:null,version:1});await api.contact('session','p');reply({id:'p',version:2,state:'updated'});await api.setContact('session','p',null,1,'contact-key');
 reply({id:'c',expires_at:'2026-10-13T00:05:00Z',resend_after_seconds:60});await api.challenge('session','demo@example.test');reply({id:'c',version:1,state:'verified'});await api.verify('session','c','123456');
 expect(transport.mock.calls.every(([url])=>!url.includes('secret')&&!url.includes('123456'))).toBe(true);
 for(const value of [{items:[{...membership,version:0}],next_cursor:null},{items:[{...membership,active:'yes'}],next_cursor:null},{items:[],next_cursor:42}]){reply(value);await expect(api.memberships('session')).rejects.toMatchObject({code:'INVALID_RESPONSE'});}
 reply({items:[{...invitation,delivery_state:'received'}],next_cursor:null});await expect(api.invitations('session','p')).rejects.toMatchObject({code:'INVALID_RESPONSE'});
 reply({id:'c',expires_at:'invalid',resend_after_seconds:60});await expect(api.challenge('session','demo@example.test')).rejects.toMatchObject({code:'INVALID_RESPONSE'});
 await expect(createOrganizationsApi(undefined).memberships('session')).rejects.toMatchObject({code:'CONFIG'});
});
