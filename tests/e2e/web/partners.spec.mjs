import { test, expect } from './fixtures.mjs';
import { randomUUID } from 'node:crypto';
test('provider publishes real profile, customer finds it, private fields stay hidden, lost save response retries safely',async({page,browser,environment})=>{
 const email='provider@example.test',password='web-partner-test-password';
 const created=await page.request.post(environment.apiUrl+'/auth/register',{data:{email,password,display_name:'Provider test'}});const account=await created.json();
 await environment.pool.query("INSERT INTO identities(user_id,provider,subject,verified_at) VALUES($1,'phone','+84900000011',now())",[account.user.id]);
 await page.goto(environment.webUrl);await page.getByTestId('nav-account').click();await page.getByTestId('auth-email').fill(email);await page.getByTestId('auth-password').fill(password);await page.getByTestId('auth-submit').click();
 await page.getByTestId('partners-open').click();await page.getByTestId('partner-create-open').click();await page.getByTestId('partner-kind-company').click();await page.getByTestId('partner-name').fill('P0 Company');await page.getByTestId('partner-create').click();
 await expect(page.getByTestId('partner-publication')).toBeVisible();
 await page.getByRole('textbox',{name:'Giới thiệu',exact:true}).fill('Repairs near Hanoi');await page.getByLabel('Điện thoại liên hệ',{exact:true}).fill('Contact only after login');
 const attempts=[];
 await page.route('**/v1/partners/*/profile',async route=>{if(route.request().method()!=='PUT'){await route.continue();return;}attempts.push({key:route.request().headers()['idempotency-key'],body:route.request().postDataJSON()});if(attempts.length===1){await route.fetch();await route.abort('failed');}else await route.continue();});
 await page.getByTestId('partner-save-profile').click();await page.getByTestId('partner-retry').click();await expect(page.getByTestId('partner-saved')).toBeVisible();expect(attempts[0]).toEqual(attempts[1]);await page.unroute('**/v1/partners/*/profile');
 await page.getByTestId('partner-section-skills').click();await page.getByRole('button',{name:'Điện nước',exact:true}).click();await page.getByTestId('partner-add-skill-socket_replacement').click();await page.getByLabel('Giá công tham khảo (đ)',{exact:true}).fill('0');await page.getByTestId('partner-save-skills').click();await expect(page.getByTestId('partner-saved')).toBeVisible();
 await page.getByTestId('partner-section-areas').click();await page.getByTestId('partner-add-area').click();await page.getByLabel('Tên khu vực',{exact:true}).fill('Hanoi area');if (!await page.getByTestId('area-0-lat').isVisible()) await page.getByTestId('area-0-advanced').click();await page.getByTestId('area-0-lat').fill('21.0285');await page.getByTestId('area-0-lng').fill('105.8542');await page.getByTestId('area-0-radius').fill('5000');
 await page.getByRole('button',{name:'English',exact:true}).click();await expect(page.getByTestId('area-0-lat')).toHaveValue('21.0285');await page.getByRole('button',{name:'日本語',exact:true}).click();await expect(page.getByTestId('area-0-radius')).toHaveValue('5000');await page.getByRole('button',{name:'Tiếng Việt',exact:true}).click();
 await page.getByTestId('partner-save-areas').click();await expect(page.getByTestId('partner-saved')).toBeVisible();await page.getByTestId('partner-publication').click();await expect(page.getByTestId('partner-availability')).toHaveText('Bật nhận việc');await page.getByTestId('partner-availability').click();await expect(page.getByTestId('partner-availability')).toHaveText('Tắt nhận việc');
 const context=await browser.newContext();const customer=await context.newPage();
 try {
  await customer.goto(environment.webUrl);await customer.getByTestId('search-open').click();if (!await customer.getByTestId('search-lat').isVisible()) await customer.getByTestId('search-advanced').click();await customer.getByTestId('search-lat').fill('21.0285');await customer.getByTestId('search-lng').fill('105.8542');await customer.getByTestId('search-submit').click();
  await expect(customer.getByText('P0 Company',{exact:true})).toBeVisible();await customer.getByRole('button',{name:'Xem hồ sơ',exact:true}).click();await expect(customer.getByText('Repairs near Hanoi')).toBeVisible();await expect(customer.getByText('Contact only after login')).toHaveCount(0);
  await customer.getByRole('button',{name:'Quay lại',exact:true}).click();await page.getByTestId('partner-availability').click();await customer.getByTestId('search-submit').click();await expect(customer.getByText('P0 Company',{exact:true})).toHaveCount(0);await expect(customer.getByText(/Chưa có người phù hợp/)).toBeVisible();
 } finally { await context.close(); }
 const rows=(await environment.pool.query('SELECT id,name,kind,publication_status,accepting_jobs FROM partners')).rows;expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({name:'P0 Company',kind:'company',publication_status:'published',accepting_jobs:false});
 const headers={Authorization:'Bearer '+account.access_token,'Idempotency-Key':randomUUID()};
 expect((await page.request.get(environment.apiUrl+'/partners/'+rows[0].id+'/management',{headers})).status()).toBe(200);
});
