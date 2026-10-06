import { test, expect } from './fixtures.mjs';
import { AuthService } from '../../../services/api/dist/src/modules/auth/auth.service.js';

test('bulk revocation covers all pages, survives a lost response and resumes only navigation after login',async({page,environment})=>{
  const email='security-batch@example.test',password='web-test-only-password';
  const auth=environment.app.get(AuthService);
  const logins=[await auth.register(email,password,'Security batch')];
  for(let i=0;i<21;i++) logins.push(await auth.login(email,password));
  await page.goto(environment.webUrl);await page.getByTestId('nav-account').click();
  await page.getByRole('textbox',{name:'Email',exact:true}).fill(email);await page.getByRole('textbox',{name:'Mật khẩu',exact:true}).fill(password);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await page.getByTestId('sessions-open').click();
  const mutations=[];
  await page.route('**/v1/me/sessions/*/revoke',async route=>{
    mutations.push({url:route.request().url(),key:route.request().headers()['idempotency-key']});
    if(mutations.length===2){await route.fetch();await route.abort('failed');}else await route.continue();
  });
  await page.getByTestId('sessions-revoke-others').click();await expect(page.getByText(/Thu hồi 22 phiên khác vừa tìm thấy/)).toBeVisible();
  // This login happens after the target snapshot: it must not be swept into a retry.
  const later=await auth.login(email,password);
  await page.getByTestId('sessions-confirm-others').click();
  await expect(page.getByTestId('sessions-batch-retry')).toBeVisible();await expect(page.getByTestId('sessions-batch-progress')).toContainText('1/22');
  await page.getByTestId('sessions-batch-retry').click();await expect(page.getByTestId('sessions-batch-done')).toContainText('22');
  expect(mutations).toHaveLength(23);expect(mutations[1]).toEqual(mutations[2]);
  for(const login of logins){
    expect((await page.request.get(environment.apiUrl+'/me',{headers:{Authorization:'Bearer '+login.access_token}})).status()).toBe(401);
  }
  expect((await page.request.post(environment.apiUrl+'/auth/refresh',{data:{refresh_token:logins[1].refresh_token}})).status()).toBe(401);
  expect((await page.request.get(environment.apiUrl+'/me',{headers:{Authorization:'Bearer '+later.access_token}})).status()).toBe(200);
  await page.unroute('**/v1/me/sessions/*/revoke');
  await page.getByRole('button',{name:'Quay lại',exact:true}).click();await page.getByTestId('addresses-open').click();await page.getByTestId('address-add').click();await page.getByTestId('address-label').fill('Do not replay this draft');
  await environment.pool.query('UPDATE sessions SET revoked_at=now()');
  // A fresh authenticated read discovers revocation and removes the private draft.
  await page.getByTestId('account-reload').click();await page.getByTestId('account-continue-login').click();
  await page.getByRole('textbox',{name:'Email',exact:true}).fill(email);await page.getByRole('textbox',{name:'Mật khẩu',exact:true}).fill(password);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await expect(page.getByTestId('addresses-empty')).toBeVisible();await expect(page.getByTestId('address-label')).toHaveCount(0);
  expect((await environment.pool.query('SELECT count(*)::int n FROM saved_addresses')).rows[0].n).toBe(0);
});
