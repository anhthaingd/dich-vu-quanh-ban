import {test,expect} from './fixtures.mjs';
import {AuthService} from '../../../services/api/dist/src/modules/auth/auth.service.js';
import {LocalMessages} from '../../../services/api/dist/src/integrations/local-messages.js';
import {resolve} from 'node:path';
import {mkdir} from 'node:fs/promises';
test.use({teamLocal:true});
test('P2 account locale overrides guest, persists before display, restores guest; local OTP login and recovery UI',async({page,environment})=>{
 await Promise.all(['B01-08','I18N-05'].map(name=>mkdir(resolve('test-results/web/report-screenshots',name),{recursive:true})));
 const auth=environment.app.get(AuthService),email='owner@example.test',password='p2-account-web-password';const account=await auth.register(email,password,'DEMO account P2');await environment.pool.query('UPDATE identities SET verified_at=now() WHERE user_id=$1',[account.user.id]);
 await page.goto(environment.webUrl);await page.getByTestId('nav-account').click();await page.getByTestId('locale-ja').click();await expect(page.getByTestId('auth-submit')).toContainText('ログイン');
 await page.getByTestId('auth-email').fill(email);await page.getByTestId('auth-password').fill(password);await page.getByTestId('auth-submit').click();await expect(page.getByTestId('security-open')).toContainText('Bảo mật tài khoản');
 await page.getByTestId('locale-en').click();await expect(page.getByTestId('security-open')).toContainText('Account security');expect((await environment.pool.query('SELECT locale FROM users WHERE id=$1',[account.user.id])).rows[0].locale).toBe('en');
 await page.screenshot({path:resolve('test-results/web/report-screenshots/I18N-05/01-account-en-web.png'),fullPage:true});
 await page.getByTestId('security-open').click();await expect(page.getByRole('textbox',{name:'Current password',exact:true})).toBeVisible();await page.screenshot({path:resolve('test-results/web/report-screenshots/B01-08/01-security-web.png'),fullPage:true});
 await page.getByRole('button',{name:'Back',exact:true}).last().click();await page.getByTestId('auth-logout').click();await expect(page.getByTestId('auth-submit')).toContainText('ログイン');
 await page.screenshot({path:resolve('test-results/web/report-screenshots/I18N-05/02-guest-ja-web.png'),fullPage:true});
 await page.getByTestId('locale-vi').click();await page.getByTestId('otp-open').click();await page.getByRole('textbox',{name:'Email hoặc số điện thoại',exact:true}).fill(email);await page.getByRole('button',{name:'Gửi mã DEMO',exact:true}).click();await expect(page.getByRole('textbox',{name:'Mã 6 chữ số',exact:true})).toBeVisible();
 const delivery=(await environment.pool.query("SELECT d.payload_cipher FROM local_deliveries d JOIN auth_challenges c ON c.id=d.challenge_id WHERE c.purpose='login' ORDER BY d.created_at DESC LIMIT 1")).rows[0];const payload=JSON.parse(environment.app.get(LocalMessages).secrets.decrypt(delivery.payload_cipher)),code=payload.text.match(/\b\d{6}\b/)[0];
 await page.getByRole('textbox',{name:'Mã 6 chữ số',exact:true}).fill(code);await page.getByRole('button',{name:'Xác nhận',exact:true}).click();await expect(page.getByRole('textbox',{name:'Current password',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Back',exact:true}).last().click();await expect(page.getByTestId('security-open')).toContainText('Account security');await page.getByTestId('auth-logout').click();await expect(page.getByTestId('recovery-open')).toBeVisible();await page.getByTestId('recovery-open').click();await expect(page.getByRole('textbox',{name:'Liên hệ cũ',exact:true})).toBeVisible();
 await page.screenshot({path:resolve('test-results/web/report-screenshots/B01-08/02-recovery-web.png'),fullPage:true});
 expect(environment.logs.join('')).not.toContain(code);expect(environment.logs.join('')).not.toContain(password);
});
test.describe('admin recovery decisions',()=>{
 test.use({adminLocal:true,teamLocal:true});
 test('uncertain approval retries its original action and never submits approval from Reject',async({page,environment})=>{
  await mkdir(resolve('test-results/web/report-screenshots/B01-08'),{recursive:true});
  const {totp,decode32}=await import('../../../services/api/dist/src/modules/admin-auth/totp.js');
  const auth=environment.app.get(AuthService),password='p2-admin-demo-password',admin=await auth.register('p2-admin@example.test',password,'DEMO Admin'),applicant=await auth.register('owner@example.test',password,'DEMO Applicant');await environment.pool.query("INSERT INTO admin_grants(user_id,permission) VALUES($1,'accounts.manage')",[admin.user.id]);
  const recovery=await (await page.request.post(environment.apiUrl+'/auth/recovery-reports',{data:{contact_claim:'owner@example.test',reachable_contact:'worker@example.test',description:'DEMO checked account recovery evidence'}})).json();expect(recovery.id).toBeTruthy();
  await page.setViewportSize({width:1440,height:1000});await page.goto(environment.webUrl+'/admin/');await page.getByLabel('Email',{exact:true}).fill('p2-admin@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page.getByRole('heading',{name:'Thiết lập xác thực hai yếu tố',exact:true})).toBeVisible();await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.getByRole('button',{name:'Bắt đầu thiết lập',exact:true}).click();const secret=await page.locator('output.secret').textContent();await page.getByLabel('Mã ứng dụng xác thực',{exact:true}).fill(totp(decode32(secret),Math.floor(Date.now()/30000)));await page.getByRole('button',{name:'Xác thực',exact:true}).click();
  await page.getByRole('button',{name:'Khôi phục tài khoản',exact:true}).click();await page.getByRole('button',{name:recovery.id+' · Chờ duyệt',exact:true}).click();await page.getByLabel('Lý do quyết định',{exact:true}).fill('DEMO verified applicant evidence');await page.getByRole('checkbox',{name:'Đã kiểm chứng danh tính, quyền và nghĩa vụ',exact:true}).check();
  const calls=[];await page.route('**/admin/recovery-reports/*/decision',async route=>{calls.push({body:route.request().postDataJSON(),key:route.request().headers()['idempotency-key']});if(calls.length===1){await route.fetch();await route.abort('failed');}else await route.continue();});
  await page.getByRole('button',{name:'Duyệt',exact:true}).click();await expect(page.getByRole('button',{name:'Thử lại: Duyệt',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Từ chối',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Thử lại: Duyệt',exact:true}).click();await expect(page.getByText(recovery.id+' · Đã duyệt, chờ xác minh',{exact:true})).toBeVisible();expect(calls).toHaveLength(2);expect(calls[0]).toEqual(calls[1]);expect(calls[1].body.decision).toBe('approve');
  expect((await environment.pool.query('SELECT count(*)::int n FROM sessions WHERE user_id=$1',[applicant.user.id])).rows[0].n).toBe(1);await page.screenshot({path:resolve('test-results/web/report-screenshots/B01-08/03-admin-recovery-web.png'),fullPage:true});
 });
});
