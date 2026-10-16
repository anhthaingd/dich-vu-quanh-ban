import {test,expect} from './fixtures.mjs';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
test('support: private photo reports, lost response retry, additional evidence and closed history',async({page,browser,environment})=>{
 test.setTimeout(180000);const password='DEMO support password 2026';
 const call=async(token,path,method='GET',data)=>{const r=await page.request.fetch(environment.apiUrl+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),'Idempotency-Key':randomUUID()},...(data?{data}:{})});expect(r.ok(),await r.text()).toBeTruthy();return r.json();};
 const customer=await call(null,'/auth/register','POST',{email:'support@example.test',display_name:'DEMO support',password});
 const other=await call(null,'/auth/register','POST',{email:'other@example.test',display_name:'DEMO other',password});
 const login=async(tab,email)=>{await tab.goto(environment.webUrl);await tab.getByTestId('nav-account').click();await tab.getByTestId('auth-email').fill(email);await tab.getByTestId('auth-password').fill(password);await tab.getByTestId('auth-submit').click();await tab.getByTestId('support-open').click();};
 await login(page,'support@example.test');await page.getByTestId('support-create').click();await page.getByTestId('support-subject').fill('DEMO cần kiểm tra thông tin');await page.getByTestId('support-body').fill('DEMO mô tả vấn đề và mong muốn được hỗ trợ.');
 const bytes=await sharp({create:{width:320,height:180,channels:3,background:'#deebe4'}}).composite([{input:Buffer.from('<svg width="320" height="180"><text x="30" y="95" font-size="23" fill="#2457d6">DEMO EVIDENCE</text></svg>')}]).png().toBuffer();
 const photo=async()=>{const chooser=page.waitForEvent('filechooser');await page.getByTestId('evidence-pick').click();await(await chooser).setFiles({name:'demo-evidence.png',mimeType:'image/png',buffer:bytes});};
 await photo();await expect(page.getByTestId('evidence-photo')).toBeVisible();
 const attempts=[];await page.route('**/v1/reports',async route=>{if(route.request().method()!=='POST')return route.continue();attempts.push({key:route.request().headers()['idempotency-key'],body:route.request().postDataJSON()});if(attempts.length===1){await route.fetch();await route.abort('failed');}else await route.continue();});
 await page.getByTestId('support-send').click();await page.getByTestId('work-retry').click();await expect(page.getByTestId('support-state')).toHaveText('Mới gửi');expect(attempts).toHaveLength(2);expect(attempts[0]).toEqual(attempts[1]);
 const r=(await call(customer.access_token,'/reports')).items[0];expect(r.evidence_ids).toHaveLength(1);
 const alien=await page.request.get(environment.apiUrl+'/reports/'+r.id,{headers:{Authorization:'Bearer '+other.access_token}});expect(alien.status()).toBe(404);
 expect((await page.request.get(environment.apiUrl+'/assets/'+r.evidence_ids[0])).status()).toBe(404);
 const directory='test-results/web/report-screenshots/B09-01';await mkdir(directory,{recursive:true});await page.screenshot({path:directory+'/web-report.png',fullPage:true});
 await environment.pool.query("UPDATE reports SET state='awaiting_evidence' WHERE id=$1",[r.id]);
 await page.getByTestId('support-list').click();await page.getByTestId('support-open-'+r.id).click();await expect(page.getByTestId('support-state')).toHaveText('Chờ bổ sung');
 await photo();await expect(page.getByTestId('evidence-photo')).toHaveCount(2);await page.getByTestId('support-body').fill('DEMO bổ sung ảnh để đối chiếu.');await page.getByTestId('support-send').click();await expect(page.getByTestId('support-state')).toHaveText('Đang xem xét');await expect(page.getByText('DEMO bổ sung ảnh để đối chiếu.')).toBeVisible();
 await environment.pool.query("INSERT INTO report_updates(report_id,actor_id,body,visibility) VALUES($1,$2,'PRIVATE ADMIN NOTE','admin_only')",[r.id,other.user.id]);
 await environment.pool.query("UPDATE reports SET state='closed' WHERE id=$1",[r.id]);await page.getByTestId('support-list').click();await page.getByTestId('support-open-'+r.id).click();await expect(page.getByTestId('support-state')).toHaveText('Đã đóng');await expect(page.getByTestId('support-send')).toHaveCount(0);await expect(page.getByText('PRIVATE ADMIN NOTE')).toHaveCount(0);
 await page.screenshot({path:directory+'/web-closed-history.png',fullPage:true});
 const context=await browser.newContext();try{const outsider=await context.newPage();await login(outsider,'other@example.test');await expect(outsider.getByText('Chưa có yêu cầu phù hợp.')).toBeVisible();await expect(outsider.getByText('DEMO cần kiểm tra thông tin')).toHaveCount(0);}finally{await context.close();}
 expect((await environment.pool.query('SELECT count(*) FROM reports')).rows[0].count).toBe('1');expect((await environment.pool.query('SELECT count(*) FROM ledger_transactions')).rows[0].count).toBe('0');
});
