import {test,expect} from './fixtures.mjs';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import sharp from 'sharp';
test('invoice: photo, revision, points, lost confirm response and two payment marks',async({page,browser,environment})=>{
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
 const signIn=async(tab,name)=>{await tab.goto(environment.webUrl);await tab.getByTestId('nav-account').click();await tab.getByTestId('auth-email').fill(name+'@example.test');await tab.getByTestId('auth-password').fill(password);await tab.getByTestId('auth-submit').click();await tab.getByTestId('jobs-open').click();};
 const context=await browser.newContext({viewport:{width:390,height:844}}),client=await context.newPage();
 const capture=async(tab,id,path)=>{await tab.setViewportSize({width:390,height:2000});await tab.getByTestId(id).screenshot({path});await tab.setViewportSize({width:390,height:844});};
 const directory='docs/ke-hoach-trien-khai/bao-cao/anh/B06-01';await mkdir(directory,{recursive:true});
 try{
 await signIn(page,'DEMO-worker');await page.getByTestId('jobs-partner-'+partner).click();await page.getByTestId('job-open-'+job).click();await page.getByTestId('job-invoice').click();await expect(page.getByTestId('invoice-editor')).toBeVisible();
 const bytes=await sharp({create:{width:640,height:360,channels:3,background:'#dce9e5'}}).composite([{input:Buffer.from('<svg width="640" height="360"><text x="70" y="180" font-size="36" fill="#16233b">DEMO - Work result</text><text x="70" y="230" font-size="22" fill="#2457d6">Test image, not customer data</text></svg>')}]).png().toBuffer();
 const chooserPromise=page.waitForEvent('filechooser');await page.getByTestId('invoice-pick').click();await(await chooserPromise).setFiles({name:'demo-result.png',mimeType:'image/png',buffer:bytes});await expect(page.getByTestId('invoice-photo')).toBeVisible();
 await page.getByTestId('invoice-materials').fill('100000');await page.getByTestId('invoice-labor').fill('200000');await page.getByTestId('invoice-note').fill('DEMO đã thay ổ điện và kiểm tra an toàn.');await capture(page,'invoice-editor',directory+'/web-editor.png');await page.getByTestId('invoice-send').click();await expect(page.getByTestId('invoice-review')).toBeVisible();
 await signIn(client,'DEMO-customer');await client.getByTestId('job-open-'+job).click();await client.getByTestId('job-invoice').click();await expect(client.getByTestId('invoice-points')).toHaveValue('0');await expect(client.getByText('DEMO đã thay ổ điện và kiểm tra an toàn.')).toBeVisible();await capture(client,'invoice-review',directory+'/web-customer-review.png');
 await client.getByTestId('invoice-revise').click();await client.getByTestId('invoice-reason').fill('DEMO vật tư đã thống nhất 50000đ');await client.getByTestId('invoice-revision-send').click();await expect(client.getByText(/Đã yêu cầu sửa: DEMO/)).toBeVisible();
 await page.getByTestId('invoice-reload').click();await expect(page.getByTestId('invoice-editor')).toBeVisible();await page.getByTestId('invoice-materials').fill('50000');await page.getByTestId('invoice-send').click();await expect(page.getByTestId('invoice-review')).toBeVisible();
 await client.getByTestId('invoice-reload').click();await expect(client.getByTestId('invoice-points')).toHaveValue('0');await client.getByTestId('invoice-points').fill('50000');
 const attempts=[];await client.route('**/invoices/*/confirm',async route=>{attempts.push({key:route.request().headers()['idempotency-key'],body:route.request().postDataJSON()});if(attempts.length===1){await route.fetch();await route.abort('failed');}else await route.continue();});
 await client.getByTestId('invoice-confirm').click();await client.getByTestId('work-retry').click();await expect(client.getByTestId('invoice-paid')).toBeVisible();expect(attempts).toHaveLength(2);expect(attempts[0]).toEqual(attempts[1]);await client.unroute('**/invoices/*/confirm');await capture(client,'invoice-review',directory+'/web-payment.png');
 await page.getByTestId('invoice-reload').click();await expect(page.getByTestId('invoice-receive')).toBeDisabled();await page.getByTestId('invoice-receive-check').click();await page.getByTestId('invoice-receive').click();await expect(page.getByText('Đã ghi nhận nhận tiền. Chờ khách báo đã thanh toán.')).toBeVisible();
 await client.getByTestId('invoice-reload').click();await client.getByTestId('invoice-paid').click();await expect(client.getByTestId('invoice-done')).toBeVisible();await capture(client,'invoice-review',directory+'/web-completed.png');
 await page.getByTestId('invoice-reload').click();await expect(page.getByTestId('invoice-done')).toBeVisible();await page.getByTestId('invoice-history').click();await expect(page.getByText('Quyết toán công việc')).toBeVisible();await page.getByTestId('invoice-history').scrollIntoViewIfNeeded();await page.screenshot({path:directory+'/web-worker-completed.png'});
 const invoice=await call(customer.access_token,'/jobs/'+job+'/invoice');expect(invoice.points_used).toBe('50000');expect(invoice.cash_due).toBe('200000');expect(invoice.reward).toBe('3200');expect(invoice.review_eligible).toBe(true);
 expect((await call(customer.access_token,'/me/points')).balance).toBe('33200');expect((await call(worker.access_token,'/partners/'+partner+'/wallet')).balance).toBe('30000');expect((await environment.pool.query('SELECT count(*) FROM settlements')).rows[0].count).toBe('1');
 }finally{await context.close();}
});
