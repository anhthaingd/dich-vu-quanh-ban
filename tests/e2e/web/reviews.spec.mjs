import {test,expect} from './fixtures.mjs';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
test.use({realtime:true});
test('reviews: both directions, lost response retry, edit and removal through real API',async({page,browser,environment})=>{
 test.setTimeout(180000);const password='DEMO invoice password 2026';
 const call=async(token,path,method='GET',data)=>{const r=await page.request.fetch(environment.apiUrl+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),'Idempotency-Key':randomUUID()},...(data?{data}:{})});expect(r.ok(),await r.text()).toBeTruthy();return r.json();};
 const account=async(name)=>call(null,'/auth/register','POST',{email:name+'@example.test',display_name:name,password});
 const worker=await account('DEMO-worker'),customer=await account('DEMO-customer');
 const partner=(await environment.pool.query("INSERT INTO partners(kind,name) VALUES('solo','DEMO sửa điện') RETURNING id")).rows[0].id;
 const member=(await environment.pool.query('INSERT INTO memberships(partner_id,user_id,is_owner) VALUES($1,$2,true) RETURNING id',[partner,worker.user.id])).rows[0].id;
 await environment.pool.query("INSERT INTO ledger_accounts(owner_partner_id,unit) VALUES($1,'VND')",[partner]);
 const job=(await environment.pool.query("INSERT INTO jobs(customer_id,partner_id,state,service_mode,address_snapshot,point,time_mode,note) VALUES($1,$2,'accepted','at_customer',$3,ST_SetSRID(ST_MakePoint(105,21),4326)::geography,'now','DEMO sửa ổ điện') RETURNING id",[customer.user.id,partner,JSON.stringify({text:'DEMO Hà Nội',point:{latitude:21,longitude:105}})])).rows[0].id;
 await environment.pool.query('INSERT INTO assignments(job_id,partner_id,membership_id,assigned_by) VALUES($1,$2,$3,$4)',[job,partner,member,worker.user.id]);
 await environment.pool.query("INSERT INTO ledger_accounts(owner_user_id,unit,balance) VALUES($1,'POINT',80000)",[customer.user.id]);

 const asset=(await environment.pool.query("INSERT INTO assets(uploader_id,object_key,purpose,mime,bytes,status) VALUES($1,$2,'result','image/png',1,'ready') RETURNING id",[worker.user.id,randomUUID()])).rows[0].id;
 let invoice=await call(worker.access_token,`/jobs/${job}/invoice-draft`,'PUT',{expected_version:1,labor:'0',materials:'0',result_asset_ids:[asset]});
 invoice=await call(worker.access_token,`/invoices/${invoice.id}/send`,'POST',{expected_version:invoice.version,draft_version_id:invoice.version_id});
 invoice=await call(customer.access_token,`/invoices/${invoice.id}/confirm`,'POST',{expected_version:invoice.version,version_id:invoice.version_id,points_used:'0'});
 invoice=(await call(worker.access_token,`/invoices/${invoice.id}/settle`,'POST',{expected_version:invoice.version,version_id:invoice.version_id,received_in_full:true})).invoice;
 const login=async(tab,name,asWorker=false)=>{await tab.goto(environment.webUrl);await tab.getByTestId('nav-account').click();await tab.getByTestId('auth-email').fill(name+'@example.test');await tab.getByTestId('auth-password').fill(password);await tab.getByTestId('auth-submit').click();await tab.getByTestId('jobs-open').click();if(asWorker)await tab.getByTestId('jobs-partner-'+partner).click();await tab.getByTestId('job-open-'+job).click();await tab.getByTestId('job-reviews').click();};
 await login(page,'DEMO-customer');await expect(page.getByTestId('reviews-locked')).toBeVisible();await expect(page.getByTestId('review-save')).toHaveCount(0);
 await call(customer.access_token,`/invoices/${invoice.id}/payment-reported`,'POST',{expected_version:invoice.version,version_id:invoice.version_id,confirmed:true});
 await page.getByTestId('reviews-reload').click();await expect(page.getByTestId('review-save')).toBeDisabled();await page.getByTestId('review-star-5').click();await page.getByTestId('review-body').fill('DEMO làm đúng hẹn, gọn gàng.');
 const attempts=[];await page.route('**/jobs/*/reviews',async route=>{if(route.request().method()!=='POST')return route.continue();attempts.push({key:route.request().headers()['idempotency-key'],body:route.request().postDataJSON()});if(attempts.length===1){await route.fetch();await route.abort('failed');}else await route.continue();});
 await page.getByTestId('review-save').click();await page.getByTestId('work-retry').click();await expect(page.getByTestId('review-edit')).toBeVisible();expect(attempts).toHaveLength(2);expect(attempts[0]).toEqual(attempts[1]);
 await page.getByTestId('review-edit').click();await page.getByTestId('review-star-4').click();await page.getByTestId('review-body').fill('DEMO đã bổ sung nhận xét.');await page.getByTestId('review-save').click();await expect(page.getByText('DEMO đã bổ sung nhận xét.')).toBeVisible();
 await page.getByTestId('review-visibility').click();await expect(page.getByText('Tác giả đã gỡ đánh giá này')).toBeVisible();await page.getByTestId('review-visibility').click();await expect(page.getByText('Tác giả đã gỡ đánh giá này')).toHaveCount(0);
 const context=await browser.newContext({viewport:{width:390,height:844}});try{const w=await context.newPage();await login(w,'DEMO-worker',true);await w.getByTestId('review-star-5').click();await w.getByTestId('review-body').fill('DEMO khách trao đổi rõ ràng.');await w.getByTestId('review-save').click();await expect(w.getByText('DEMO khách trao đổi rõ ràng.')).toBeVisible();await page.getByTestId('reviews-reload').click();await expect(page.getByText('DEMO khách trao đổi rõ ràng.')).toBeVisible();
 const dir='test-results/web/report-screenshots/B10-01';await mkdir(dir,{recursive:true});await page.screenshot({path:dir+'/web-customer.png',fullPage:true});await w.screenshot({path:dir+'/web-provider.png',fullPage:true});
 }finally{await context.close();}
 const rows=(await environment.pool.query('SELECT * FROM reviews WHERE job_id=$1',[job])).rows;expect(rows).toHaveLength(2);expect(rows.find(r=>r.direction==='customer_to_partner').stars).toBe(4);
});
