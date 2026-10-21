import {test,expect} from './fixtures.mjs';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import sharp from 'sharp';
import {totp,decode32} from '../../../services/api/dist/src/modules/admin-auth/totp.js';
test.use({adminLocal:true});
test('admin completion on desktop and mobile previews money, retries once and preserves payment marks and report state',async({page,browser,environment})=>{
 test.setTimeout(180000);const password='DEMO completion password 2026';
 const call=async(token,path,method='GET',data)=>{const r=await page.request.fetch(environment.apiUrl+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),'Idempotency-Key':randomUUID()},...(data?{data}:{})});expect(r.ok(),await r.text()).toBeTruthy();return r.json();};
 const register=email=>call(null,'/auth/register','POST',{email,password,display_name:'DEMO completion'});
 const customer=await register('completion-customer@example.test'),worker=await register('completion-worker@example.test');
 const partner=(await environment.pool.query("INSERT INTO partners(kind,name) VALUES('solo','DEMO completion worker') RETURNING id")).rows[0].id;
 const member=(await environment.pool.query('INSERT INTO memberships(partner_id,user_id,is_owner) VALUES($1,$2,true) RETURNING id',[partner,worker.user.id])).rows[0].id;
 await environment.pool.query("INSERT INTO ledger_accounts(owner_partner_id,unit) VALUES($1,'VND')",[partner]);await environment.pool.query("INSERT INTO ledger_accounts(owner_user_id,unit,balance) VALUES($1,'POINT',200000)",[customer.user.id]);
 const bytes=await sharp({create:{width:360,height:150,channels:3,background:'#e4f1ed'}}).composite([{input:Buffer.from('<svg width="360" height="150"><text x="20" y="82" font-size="22" fill="#174d42">DEMO WORK COMPLETE</text></svg>')}]).png().toBuffer();
 const upload=async(token,purpose)=>{const grant=await call(token,'/assets/upload-grants','POST',{purpose,mime:'image/png',bytes:bytes.length});expect((await page.request.put(grant.upload_url,{headers:grant.required_headers,data:bytes})).ok()).toBeTruthy();await call(token,`/assets/${grant.asset_id}/complete`,'POST',{expected_version:1});return grant.asset_id;};
 const dir='test-results/web/report-screenshots/B09-04';await mkdir(dir,{recursive:true});
 for(const mobile of [false,true]){
  const email=mobile?'completion-mobile-admin@example.test':'completion-web-admin@example.test',admin=await register(email);
  for(const permission of ['support.read','finance.review','audit.read'])await environment.pool.query('INSERT INTO admin_grants(user_id,permission) VALUES($1,$2)',[admin.user.id,permission]);
  const job=(await environment.pool.query("INSERT INTO jobs(customer_id,partner_id,state,service_mode,address_snapshot,point,time_mode) VALUES($1,$2,'accepted','at_customer',$3,ST_GeogFromText('SRID=4326;POINT(105.8 21)'), 'now') RETURNING id",[customer.user.id,partner,JSON.stringify({text:'DEMO',point:{latitude:21,longitude:105.8}})])).rows[0].id;
  await environment.pool.query('INSERT INTO assignments(job_id,partner_id,membership_id,assigned_by) VALUES($1,$2,$3,$4)',[job,partner,member,worker.user.id]);
  let invoice=await call(worker.access_token,`/jobs/${job}/invoice-draft`,'PUT',{expected_version:1,labor:'100000',materials:'50000',result_asset_ids:[await upload(worker.access_token,'result')]});
  invoice=await call(worker.access_token,`/invoices/${invoice.id}/send`,'POST',{expected_version:invoice.version,draft_version_id:invoice.version_id});
  invoice=await call(customer.access_token,`/invoices/${invoice.id}/confirm`,'POST',{expected_version:invoice.version,version_id:invoice.version_id,points_used:mobile?'150000':'50000'});
  const report=await call(customer.access_token,'/reports','POST',{kind:'invoice',subject:mobile?'DEMO mobile completion':'DEMO web completion',body:'DEMO work and direct payment evidence',invoice_id:invoice.id,invoice_version_id:invoice.version_id,evidence_ids:[await upload(customer.access_token,'evidence')]});
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}});try{
   const desk=await context.newPage();desk.setDefaultTimeout(15000);await desk.goto(environment.webUrl+(mobile?'':'/admin/'));
   if(mobile){await desk.getByTestId('nav-account').click();await desk.getByTestId('auth-email').fill(email);await desk.getByTestId('auth-password').fill(password);await desk.getByTestId('auth-submit').click();await desk.getByTestId('admin-password').fill(password);await desk.getByTestId('admin-verify').click();const secret=await desk.getByTestId('admin-setup-secret').textContent();await desk.getByTestId('admin-code').fill(totp(decode32(secret),Math.floor(Date.now()/30000)));await desk.getByTestId('admin-verify').click();await desk.getByTestId('admin-item-'+report.id).click();}
   else{await desk.getByLabel('Email',{exact:true}).fill(email);await desk.getByLabel('Mật khẩu',{exact:true}).fill(password);await desk.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(desk.getByRole('heading',{name:'Thiết lập xác thực hai yếu tố'})).toBeVisible();await desk.getByLabel('Mật khẩu',{exact:true}).fill(password);await desk.getByRole('button',{name:'Bắt đầu thiết lập',exact:true}).click();const secret=await desk.locator('output.secret').textContent();await desk.getByLabel('Mã ứng dụng xác thực',{exact:true}).fill(totp(decode32(secret),Math.floor(Date.now()/30000)));await desk.getByRole('button',{name:'Xác thực',exact:true}).click();await desk.getByRole('button',{name:/DEMO web completion/}).click();}
   await expect(desk.getByRole('img',{name:'Ảnh chứng cứ'})).toBeVisible();
   await expect(desk.getByTestId('admin-save')).toHaveCount(0); // finance does not imply support.manage
   await desk.getByTestId('completion-preview').click();await expect(desk.getByTestId('completion-confirm')).toBeDisabled();
   await desk.getByTestId('completion-reason').fill('DEMO đã đối chiếu công việc và thanh toán trực tiếp.');await desk.getByTestId('completion-checked').click();
   await desk.getByTestId('admin-completion').scrollIntoViewIfNeeded();await desk.screenshot({path:dir+(mobile?'/mobile-web-preview.png':'/desktop-preview.png'),fullPage:true});
   const attempts=[];await desk.route('**/admin/reports/*/complete-on-behalf',async route=>{attempts.push({key:route.request().headers()['idempotency-key'],body:route.request().postDataJSON()});if(attempts.length===1){await route.fetch();await route.abort('failed');}else await route.continue();});
   await desk.getByTestId('completion-confirm').click();await expect(desk.getByTestId('completion-confirm')).toHaveText('Thử lại');await desk.getByTestId('completion-confirm').click();await expect(desk.getByTestId('completion-confirm')).toHaveCount(0);expect(attempts[0]).toEqual(attempts[1]);
   await expect(desk.getByText('Hoàn tất thay thợ',{exact:true})).toBeVisible();await desk.screenshot({path:dir+(mobile?'/mobile-web-completed.png':'/desktop-completed.png'),fullPage:true});
   const current=await call(customer.access_token,`/jobs/${job}/invoice`);expect(current.settled).toBe(true);expect(current.worker_receipt_confirmed_at).toBeNull();expect(current.customer_payment_reported_at).toBeNull();expect(current.review_eligible).toBe(false);expect((await call(customer.access_token,`/reports/${report.id}`)).state).toBe('open');
   if(!mobile){
    await call(customer.access_token,`/invoices/${current.id}/payment-reported`,'POST',{expected_version:current.version,version_id:current.version_id,confirmed:true});
    const wc=await browser.newContext({viewport:{width:390,height:844}});try{const wp=await wc.newPage();wp.setDefaultTimeout(15000);await wp.goto(environment.webUrl);await wp.getByTestId('nav-account').filter({visible:true}).click();await wp.getByTestId('auth-email').fill('completion-worker@example.test');await wp.getByTestId('auth-password').fill(password);await wp.getByTestId('auth-submit').click();await wp.getByTestId('jobs-open').click();await wp.getByTestId('jobs-partner-'+partner).click();await wp.getByTestId('job-open-'+job).click();await wp.getByTestId('job-invoice').click();await expect(wp.getByTestId('invoice-receive')).toBeDisabled();await wp.getByTestId('invoice-receive-check').click();await wp.getByTestId('invoice-receive').click();await expect(wp.getByTestId('invoice-done')).toBeVisible();
     const nextDir='test-results/web/report-screenshots/P1-06';await mkdir(nextDir,{recursive:true});await wp.screenshot({path:nextDir+'/worker-receipt.png',fullPage:true});
     await call(worker.access_token,`/jobs/${job}/reviews`,'POST',{stars:5,body:'DEMO khách hợp tác tốt.'});await wp.getByRole('button',{name:'Quay lại',exact:true}).click();await wp.getByTestId('customer-reviews-open').click();await expect(wp.getByText('DEMO khách hợp tác tốt.',{exact:true})).toBeVisible();await wp.getByText('DEMO khách hợp tác tốt.',{exact:true}).scrollIntoViewIfNeeded();await wp.screenshot({path:nextDir+'/customer-history.png',fullPage:true});
     await wp.getByRole('button',{name:'Quay lại',exact:true}).filter({visible:true}).click();await wp.getByRole('button',{name:'Quay lại',exact:true}).filter({visible:true}).click();await wp.getByTestId('notification-settings-open').filter({visible:true}).click();await expect(wp.getByText('Đăng ký push trên app iOS hoặc Android.',{exact:true})).toBeVisible();await wp.screenshot({path:nextDir+'/push-settings-web.png',fullPage:true});
    }finally{await wc.close();}
   }

  }finally{await context.close();}
 }
 expect((await environment.pool.query('SELECT count(*) FROM settlements')).rows[0].count).toBe('2');expect((await environment.pool.query('SELECT sum(delta) FROM ledger_entries GROUP BY unit HAVING sum(delta)<>0')).rows).toHaveLength(0);
});
