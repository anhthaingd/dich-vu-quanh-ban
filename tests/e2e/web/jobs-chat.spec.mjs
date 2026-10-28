import {test,expect} from './fixtures.mjs';
import {chooseLocation} from './location-helper.mjs';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
test.use({realtime:true});
const point={latitude:21.0285,longitude:105.8542},password='DEMO jobs chat password 2026';
test('two accounts request all service modes, accept ETA, retry safely, chat, reschedule and stop',async({page,browser,environment})=>{
 test.setTimeout(150000);
 await mkdir('test-results/web/report-screenshots/B03-04',{recursive:true});
 const request=async(token,path,method='GET',data)=>{const r=await page.request.fetch(environment.apiUrl+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),'Idempotency-Key':randomUUID()},...(data?{data}:{})});expect(r.ok(),await r.text()).toBeTruthy();return r.json();};
 const account=async(name,phone)=>{const a=await request(null,'/auth/register','POST',{email:name+'@example.test',password,display_name:name});await environment.pool.query("INSERT INTO identities(user_id,provider,subject,verified_at) VALUES($1,'phone',$2,now())",[a.user.id,phone]);return a;};
 const provider=await account('DEMO-provider','+84900000111'),client=await account('DEMO-customer','+84900000112');
 const skill=(await environment.pool.query("SELECT id FROM skills WHERE code='socket_replacement'")).rows[0].id;
 let p=await request(provider.access_token,'/partners','POST',{kind:'solo',name:'DEMO sửa điện'});
 for(const [section,body] of Object.entries({skills:{skills:[{skill_id:skill,modes:['at_customer','at_shop','custom']}]},'service-areas':{areas:[{label:'DEMO Hà Nội',center:point,radius_m:5000}]},locations:{locations:[{address:{text:'DEMO cửa hàng Hà Nội',point},public:true}]},publication:{publication_status:'published'},availability:{accepting_jobs:true}}))p=await request(provider.access_token,`/partners/${p.id}/${section}`,'PUT',{expected_version:p.version,...body});
 const signIn=async(tab,email)=>{await tab.goto(environment.webUrl);await tab.getByTestId('nav-account').click();await tab.getByTestId('auth-email').fill(email);await tab.getByTestId('auth-password').fill(password);await tab.getByTestId('auth-submit').click();await expect(tab.getByTestId('jobs-open')).toBeVisible();};
 await signIn(page,'DEMO-customer@example.test');
 await expect(page.getByTestId('account-points')).toHaveText('0 Point');
 await page.screenshot({path:'test-results/web/report-screenshots/B03-04/web-account.png'});
 const context=await browser.newContext({viewport:{width:390,height:844}}),providerPage=await context.newPage();
 try{
 await signIn(providerPage,'DEMO-provider@example.test');
 await page.getByTestId('nav-back').click();await chooseLocation(page,'search',point);await page.getByTestId('search-submit').click();await expect(page.getByRole('button',{name:'Xem hồ sơ',exact:true})).toBeVisible();await page.screenshot({path:'test-results/web/report-screenshots/B03-04/web-search.png'});await page.getByRole('button',{name:'Xem hồ sơ',exact:true}).click();await expect(page.getByTestId('profile-hire')).toBeVisible();await page.screenshot({path:'test-results/web/report-screenshots/B03-04/web-profile.png'});
 await page.getByTestId('profile-chat').click();await page.getByTestId('chat-body').fill('DEMO hỏi trước khi thuê');await page.getByTestId('chat-send').click();await expect(page.getByText('DEMO hỏi trước khi thuê',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Quay lại',exact:true}).click();
 for(const mode of ['at_customer','at_shop','custom']){
 await page.getByTestId('profile-hire').click();await page.getByTestId('job-skill-'+skill).click();await page.getByTestId('job-mode-'+mode).click();
 if(mode==='at_shop')await page.getByRole('button',{name:'DEMO cửa hàng Hà Nội',exact:true}).click();else await chooseLocation(page,'job',point);
 await page.getByTestId('job-note').fill('DEMO '+mode);
 if(mode==='custom'){await page.getByTestId('job-time-scheduled').click();await page.getByTestId('job-date').fill('2030-12-10');await page.getByTestId('job-time').fill('10:30');}
 const attempts=[];
 if(mode==='at_customer')await page.route('**/v1/jobs',async route=>{if(route.request().method()!=='POST'){await route.continue();return;}attempts.push({key:route.request().headers()['idempotency-key'],body:route.request().postDataJSON()});if(attempts.length===1){await route.fetch();await route.abort('failed');}else await route.continue();});
 if(mode==='at_shop'){await page.getByTestId('job-mode-at_shop').scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/web/report-screenshots/B03-04/web-create.png'});}
 await page.getByTestId('job-submit').click();if(mode==='at_customer'){await page.getByTestId('work-retry').click();await page.unroute('**/v1/jobs');expect(attempts).toHaveLength(2);expect(attempts[0]).toEqual(attempts[1]);}
 await expect(page.getByTestId('job-state')).toHaveText('Chờ phản hồi');
 if(mode!=='at_customer'){await page.getByTestId('job-action-withdraw').click();await page.getByTestId('job-reason').fill('DEMO kết thúc kiểm thử');await page.getByTestId('job-action-confirm').click();await expect(page.getByTestId('job-state')).toHaveText('Đã rút yêu cầu');await page.getByRole('button',{name:'Quay lại',exact:true}).click();continue;}
 const job=(await environment.pool.query('SELECT id FROM jobs WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 1',[client.user.id])).rows[0];
 await providerPage.getByTestId('jobs-open').click();await providerPage.getByTestId('jobs-partner-'+p.id).click();await expect(providerPage.getByTestId('job-open-'+job.id)).toBeVisible();await providerPage.screenshot({path:'test-results/web/report-screenshots/B03-04/web-list.png'});await providerPage.getByTestId('job-open-'+job.id).click();await providerPage.getByTestId('job-action-accept').click();await providerPage.getByTestId('job-eta').fill('45');await providerPage.getByTestId('job-action-confirm').click();await expect(providerPage.getByTestId('job-state')).toHaveText('Đã nhận · đang xử lý');
 await page.getByTestId('job-reload').click();await expect(page.getByTestId('job-state')).toHaveText('Đã nhận · đang xử lý');
 await mkdir('test-results/web/report-screenshots/B03-04',{recursive:true});await page.screenshot({path:'test-results/web/report-screenshots/B03-04/web-job.png'});
 await page.getByTestId('job-chat').click();await expect(page.getByRole('button',{name:'Mở trò chuyện',exact:true})).toBeVisible();await page.screenshot({path:'test-results/web/report-screenshots/B03-04/web-rooms.png'});await page.getByRole('button',{name:'Mở trò chuyện',exact:true}).click();
 const sends=[];await page.route('**/conversations/*/messages',async route=>{if(route.request().method()!=='POST'){await route.continue();return;}sends.push({key:route.request().headers()['idempotency-key'],body:route.request().postDataJSON()});if(sends.length===1){await route.fetch();await route.abort('failed');}else await route.continue();});
 await page.getByTestId('chat-body').fill('DEMO tôi đang chờ ở cửa');await page.getByTestId('chat-send').click();await page.getByTestId('work-retry').click();await expect(page.getByText('DEMO tôi đang chờ ở cửa',{exact:true})).toHaveCount(1);expect(sends[0]).toEqual(sends[1]);await page.unroute('**/conversations/*/messages');
 await providerPage.getByTestId('job-chat').click();await providerPage.getByRole('button',{name:'Mở trò chuyện',exact:true}).click();await expect(providerPage.getByText('DEMO tôi đang chờ ở cửa',{exact:true})).toBeVisible();await providerPage.getByTestId('chat-body').fill('DEMO tôi sẽ đến theo giờ đã hẹn');await providerPage.getByTestId('chat-send').click();await expect(providerPage.getByTestId('chat-body')).toHaveValue('');await expect(providerPage.getByText('DEMO tôi sẽ đến theo giờ đã hẹn',{exact:true})).toBeVisible();await expect(page.getByText('DEMO tôi sẽ đến theo giờ đã hẹn',{exact:true})).toBeVisible();await page.screenshot({path:'test-results/web/report-screenshots/B03-04/web-chat.png'});
 await page.getByRole('button',{name:'Quay lại',exact:true}).click();await page.getByRole('button',{name:'Quay lại',exact:true}).click();await page.getByTestId('job-action-reschedule').click();await page.getByTestId('job-date').fill('2030-12-11');await page.getByTestId('job-time').fill('11:30');await page.getByTestId('job-action-confirm').click();await expect(page.getByTestId('job-action-stop')).toBeVisible();
 await page.getByTestId('job-action-stop').click();await page.getByTestId('job-reason').fill('DEMO không phát sinh chi phí');await page.getByTestId('job-action-confirm').click();await expect(page.getByTestId('job-state')).toHaveText('Đã dừng');await page.getByRole('button',{name:'Quay lại',exact:true}).click();
 }
 expect((await environment.pool.query('SELECT count(*) FROM jobs')).rows[0].count).toBe('3');expect((await environment.pool.query("SELECT count(*) FROM messages WHERE body='DEMO tôi đang chờ ở cửa'")).rows[0].count).toBe('1');
 }finally{await context.close();}
});
