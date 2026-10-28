import {test,expect} from './fixtures.mjs';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
const password='DEMO notifications password 2026';
test('notifications follow real events, preserve independent reminder settings, read across sessions and recheck deep links',async({page,environment})=>{
 const call=async(token,path,method='GET',data)=>{const r=await page.request.fetch(environment.apiUrl+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),'Idempotency-Key':randomUUID()},...(data?{data}:{})});expect(r.ok(),await r.text()).toBeTruthy();return r.json();};
 const owner=await call(null,'/auth/register','POST',{email:'owner@example.test',password,display_name:'DEMO chủ cửa hàng'}),customer=await call(null,'/auth/register','POST',{email:'customer@example.test',password,display_name:'DEMO khách hàng'});
 await environment.pool.query("INSERT INTO identities(user_id,provider,subject,verified_at) VALUES($1,'phone','+84900000991',now())",[owner.user.id]);
 await environment.pool.query("INSERT INTO identities(user_id,provider,subject,verified_at) VALUES($1,'phone','+84900000992',now())",[customer.user.id]);
 let partner=await call(owner.access_token,'/partners','POST',{kind:'solo',name:'DEMO sửa điện'});
 const skill=(await environment.pool.query("SELECT id FROM skills WHERE code='socket_replacement'")).rows[0].id;
 for(const [section,body] of Object.entries({skills:{skills:[{skill_id:skill,modes:['at_customer']}]},'service-areas':{areas:[{label:'DEMO Hà Nội',center:{latitude:21.0285,longitude:105.8542},radius_m:5000}]},publication:{publication_status:'published'},availability:{accepting_jobs:true}}))partner=await call(owner.access_token,`/partners/${partner.id}/${section}`,'PUT',{expected_version:partner.version,...body});
 const room=await call(customer.access_token,'/conversations','POST',{partner_id:partner.id});
 await call(owner.access_token,`/conversations/${room.id}/messages`,'POST',{client_message_id:randomUUID(),body:'DEMO hẹn trao đổi dịch vụ'});

 const job=await call(customer.access_token,'/jobs','POST',{partner_id:partner.id,skills:[{skill_id:skill,schema_version:1,answers:{}}],service_mode:'at_customer',address:{text:'DEMO Hà Nội',point:{latitude:21.0285,longitude:105.8542}},time_mode:'now',note:'DEMO sửa điện'});
 await call(owner.access_token,`/jobs/${job.id}/accept`,'POST',{expected_version:job.version,eta:new Date(Date.now()+3600000).toISOString()});
 await page.goto(environment.webUrl);await page.getByTestId('nav-notifications').filter({visible:true}).click();await page.getByTestId('account-continue-login').filter({visible:true}).click();await page.getByTestId('auth-email').filter({visible:true}).fill('customer@example.test');await page.getByTestId('auth-password').filter({visible:true}).fill(password);await page.getByTestId('auth-submit').filter({visible:true}).click();
 await expect.poll(async()=>(await call(customer.access_token,'/me/notifications')).items.length).toBe(1);const n=(await call(customer.access_token,'/me/notifications')).items[0];expect(n.kind).toBe('job.accepted.v1');await expect(page.getByTestId('notice-'+n.id).filter({visible:true})).toBeVisible();
 await mkdir('test-results/web/report-screenshots/B05-01',{recursive:true});await page.screenshot({path:'test-results/web/report-screenshots/B05-01/web-inbox.png'});
 await page.getByTestId('notice-'+n.id).filter({visible:true}).click();await expect(page.getByTestId('job-state').filter({visible:true})).toBeVisible();
 await page.getByTestId('nav-back').filter({visible:true}).click();await page.getByTestId('notices-unread').filter({visible:true}).click();await expect(page.getByTestId('notices-empty').filter({visible:true})).toHaveText('Bạn đã đọc hết thông báo.');
 await page.getByTestId('nav-account').filter({visible:true}).click();await page.getByTestId('notification-settings-open').filter({visible:true}).click();await page.getByTestId('setting-reminder_push').filter({visible:true}).click();await page.getByTestId('notices-save').filter({visible:true}).click();await expect(page.getByTestId('notices-saved').filter({visible:true})).toBeVisible();
 expect((await call(customer.access_token,'/me/notification-settings'))).toEqual({message_push:true,call_push:true,service_push:true,reminder_push:false});
 await page.screenshot({path:'test-results/web/report-screenshots/B05-01/web-settings.png'});
 await page.getByTestId('nav-account').filter({visible:true}).click();await page.getByRole('button',{name:'日本語',exact:true}).click();await page.getByTestId('nav-back').filter({visible:true}).click();await expect(page.getByTestId('setting-reminder_push').filter({visible:true}).getByRole('switch')).not.toBeChecked();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=globalThis.innerWidth)).toBe(true);
 await page.getByTestId('nav-back').filter({visible:true}).click();await page.getByTestId('auth-logout').filter({visible:true}).click();await expect(page.getByTestId('auth-email').filter({visible:true})).toBeVisible();
 await page.getByTestId('auth-email').filter({visible:true}).fill('owner@example.test');await page.getByTestId('auth-password').filter({visible:true}).fill(password);await page.getByTestId('auth-submit').filter({visible:true}).click();await expect(page.getByTestId('notification-settings-open').filter({visible:true})).toBeVisible();await page.getByTestId('notification-settings-open').filter({visible:true}).click();await expect(page.getByTestId('setting-reminder_push').filter({visible:true}).getByRole('switch')).toBeChecked();
});
