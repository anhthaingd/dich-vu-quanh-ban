import {test,expect} from './fixtures.mjs';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
const day = date => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
test('calendar shows appointments beyond page one and reloads reschedules in customer and partner scopes',async({page,browser,environment})=>{
 test.setTimeout(150000);
 const password='DEMO calendar password 2026',point={latitude:21.0285,longitude:105.8542};
 const call=async(token,path,method='GET',data)=>{const r=await page.request.fetch(environment.apiUrl+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),'Idempotency-Key':randomUUID()},...(data?{data}:{})});expect(r.ok(),await r.text()).toBeTruthy();return r.json();};
 const account=async(name,phone)=>{const a=await call(null,'/auth/register','POST',{email:name+'@example.test',password,display_name:name});await environment.pool.query("INSERT INTO identities(user_id,provider,subject,verified_at) VALUES($1,'phone',$2,now())",[a.user.id,phone]);return a;};
 const owner=await account('DEMO-calendar-provider','+84900000311'),customer=await account('DEMO-calendar-customer','+84900000312');
 const skill=(await environment.pool.query("SELECT id FROM skills WHERE code='socket_replacement'")).rows[0].id;
 let p=await call(owner.access_token,'/partners','POST',{kind:'solo',name:'DEMO Lịch sửa điện'});
 for(const [section,body] of Object.entries({skills:{skills:[{skill_id:skill,modes:['at_customer']}]},'service-areas':{areas:[{label:'DEMO Hà Nội',center:point,radius_m:5000}]},publication:{publication_status:'published'},availability:{accepting_jobs:true}}))p=await call(owner.access_token,`/partners/${p.id}/${section}`,'PUT',{expected_version:p.version,...body});
 const tomorrow=day(new Date(Date.now()+86400000)),later=day(new Date(Date.now()+2*86400000));
 let first;
 for(let i=0;i<21;i++){
  const j=await call(customer.access_token,'/jobs','POST',{partner_id:p.id,skills:[{skill_id:skill,schema_version:1,answers:{}}],service_mode:'at_customer',address:{text:'DEMO Hà Nội',point},time_mode:'scheduled',scheduled_at:tomorrow+'T00:30:00+07:00',note:i===0?'DEMO lịch từ trang thứ hai':'DEMO lịch '+i});
  if(i===0)first=await call(owner.access_token,`/jobs/${j.id}/accept`,'POST',{expected_version:j.version});
 }
 const signIn=async(tab,email)=>{await tab.goto(environment.webUrl);await tab.getByTestId('nav-account').click();await tab.getByTestId('auth-email').fill(email);await tab.getByTestId('auth-password').fill(password);await tab.getByTestId('auth-submit').click();await tab.getByTestId('jobs-open').click();};
 const select=async(tab,date)=>{if(date.slice(0,7)!==day(new Date()).slice(0,7))await tab.getByTestId('calendar-next').click();await tab.getByTestId('calendar-day-'+date).click();};
 await signIn(page,'DEMO-calendar-customer@example.test');await page.getByTestId('jobs-view-calendar').click();await expect(page.getByTestId('jobs-calendar')).toBeVisible();await select(page,tomorrow);
 await expect(page.getByTestId('calendar-job-'+first.id)).toBeVisible();await expect(page.getByText('21 công việc trong ngày',{exact:true})).toBeVisible();
 await mkdir('test-results/web/report-screenshots/B05-04',{recursive:true});await page.getByTestId('calendar-month').scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/web/report-screenshots/B05-04/web-calendar.png'});
 await page.getByTestId('job-open-'+first.id).click();await page.getByTestId('job-action-reschedule').click();await page.getByTestId('job-date').fill(later);await page.getByTestId('job-time').fill('09:00');await page.getByTestId('job-action-confirm').click();await expect(page.getByTestId('job-action-stop')).toBeVisible();await page.getByRole('button',{name:'Quay lại',exact:true}).click();
 await expect(page.getByTestId('jobs-calendar')).toBeVisible();await expect(page.getByTestId('calendar-job-'+first.id)).toHaveCount(0);await expect(page.getByText('20 công việc trong ngày',{exact:true})).toBeVisible();
 if(later.slice(0,7)!==tomorrow.slice(0,7))await page.getByTestId('calendar-next').click();await page.getByTestId('calendar-day-'+later).click();await expect(page.getByTestId('calendar-job-'+first.id)).toBeVisible();
 const context=await browser.newContext({viewport:{width:390,height:844}});
 try{const partner=await context.newPage();await signIn(partner,'DEMO-calendar-provider@example.test');await partner.getByTestId('jobs-partner-'+p.id).click();await partner.getByTestId('jobs-view-calendar').click();await expect(partner.getByTestId('jobs-calendar')).toBeVisible();await select(partner,later);await expect(partner.getByTestId('calendar-job-'+first.id)).toBeVisible();await partner.getByTestId('calendar-month').scrollIntoViewIfNeeded();await partner.screenshot({path:'test-results/web/report-screenshots/B05-04/web-partner-calendar.png'});}finally{await context.close();}
});
