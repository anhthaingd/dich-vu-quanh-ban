import { authFixture, session } from './auth';
import { AuthSession } from '../../src/features/auth/state/auth-session';
import type { JobsApi } from '../../src/features/jobs/api/jobs-api';
import type { ChatApi } from '../../src/features/chat/api/chat-api';
import type { PartnersApi } from '../../src/features/partners/api/partners-api';
import type { Job } from '../../src/features/jobs/models';
export const job: Job = {id:'job',customer_id:session.user.id,partner_id:'partner',state:'requested',version:1,schedule_version:1,scheduled_at:null,eta:null,skills:[{skill_id:'skill',schema_version:1}],address:{text:'DEMO address',point:{latitude:21,longitude:105}},assigned_member_id:null,invoice_id:null,allowed_actions:['accept','decline','withdraw','reschedule','stop','assignments'],service_mode:'at_customer',time_mode:'now',location_id:null,note:'DEMO job'};
export const message={id:'msg1',conversation_id:'room',body:'DEMO received',sequence:1,sender_id:'peer',asset_id:null,job_id:'job',created_at:'2026-10-07T00:00:00Z'};
export const room={id:'room',kind:'direct' as const,display_name:'DEMO room',last_sequence:1,unread:1,job_ids:['job']};
export const profile={id:'partner',name:'DEMO provider',kind:'solo' as const,verification_status:'unverified' as const,bio:'',skills:[{id:'skill',code:'skill',name:'DEMO service',name_vi:'DEMO service',name_locale:'vi' as const,category_ids:['group'],schema_version:1,form_schema:{type:'object',properties:{count:{type:'integer',title:'Count'},details:{type:'string',title:'Details'},needed:{type:'boolean',title:'Needed'}}}}],public_addresses:[],public_locations:[{id:'shop',address:job.address}],service_modes:[{skill_id:'skill',modes:['at_customer','at_shop','custom'] as ('at_customer'|'at_shop'|'custom')[]}],contact:null,can_hire:true,can_message:true};
export function workFixture(){
 const jobs:jest.Mocked<JobsApi>={create:jest.fn().mockResolvedValue(job),get:jest.fn().mockResolvedValue(job),list:jest.fn().mockResolvedValue({items:[job],next_cursor:null}),change:jest.fn().mockResolvedValue(job),members:jest.fn().mockResolvedValue({items:[{id:'member',user_id:session.user.id,display_name:'DEMO worker',active:true,is_owner:true,permissions:[],version:1}],next_cursor:null})};
 const chat:jest.Mocked<ChatApi>={open:jest.fn().mockResolvedValue(room),list:jest.fn().mockResolvedValue({items:[room],next_cursor:null}),messages:jest.fn().mockResolvedValue({items:[message],next_cursor:null}),send:jest.fn().mockResolvedValue({...message,id:'sent',body:'DEMO sent',sequence:2,sender_id:session.user.id}),read:jest.fn().mockResolvedValue({id:'room',state:'read'})};
 const partners:jest.Mocked<PartnersApi>={create:jest.fn(),edit:jest.fn(),management:jest.fn().mockResolvedValue({id:'partner',name:'DEMO provider'}),profile:jest.fn().mockResolvedValue(profile),search:jest.fn()};
 const f=authFixture('saved',partners);const user={...session.user,phone_verified:true,partner_ids:['partner']};f.api.refresh.mockResolvedValue({...session,user});f.api.me.mockResolvedValue(user);
 return {...f,jobs,chat,partners,manager:new AuthSession(f.api,f.storage,f.accounts,partners,jobs,chat)};
}
