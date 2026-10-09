import {chooseLocation} from './location-helper.mjs';
import { test, expect } from './fixtures.mjs';
test('address book and session management work with real DB, lost response and remote revocation',async({page,environment})=>{
  const email='account-management@example.test',password='web-test-only-password';
  await page.goto(environment.webUrl);await page.getByTestId('nav-account').click();await page.getByTestId('auth-toggle').click();
  await page.getByTestId('auth-name').fill('Account management');await page.getByTestId('auth-email').fill(email);await page.getByTestId('auth-password').fill(password);await page.getByTestId('auth-submit').click();
  await page.getByTestId('addresses-open').click();await expect(page.getByTestId('addresses-empty')).toBeVisible();
  const fill=async(label,text)=>{await page.getByTestId('address-label').fill(label);await page.getByTestId('address-text').fill(text);await chooseLocation(page,'address',{latitude:10.77,longitude:106.7},text);};
  await page.getByTestId('address-add').click();await fill('Home','Street one');
  await page.getByRole('button',{name:'English',exact:true}).click();await expect(page.getByTestId('address-text')).toHaveValue('Street one');
  await page.getByRole('button',{name:'日本語',exact:true}).click();await expect(page.getByTestId('address-text')).toHaveValue('Street one');
  await page.getByRole('button',{name:'Tiếng Việt',exact:true}).click();
  const attempts=[];await page.route('**/v1/me/addresses',async route=>{
    if(route.request().method()!=='POST'){await route.continue();return;}
    attempts.push({key:route.request().headers()['idempotency-key'],body:route.request().postDataJSON()});
    if(attempts.length===1){await route.fetch();await route.abort('failed');}else await route.continue();
  });
  await page.getByTestId('address-save').click();await expect(page.getByTestId('account-retry')).toBeVisible();await expect(page.getByTestId('address-label')).not.toBeEditable();await page.getByTestId('account-retry').click();
  await expect(page.getByTestId('address-default-badge')).toHaveCount(1);expect(attempts[0]).toEqual(attempts[1]);
  await page.unroute('**/v1/me/addresses');
  await page.getByTestId('address-add').click();await fill('Work','Street two');await page.getByTestId('address-save').click();
  await page.getByTestId('address-make-default').click();
  await expect.poll(async () => (await environment.pool.query("SELECT label FROM saved_addresses WHERE is_default")).rows[0]?.label).toBe('Work');
  await expect(page.getByTestId('address-default-badge')).toHaveCount(1);
  let rows=(await environment.pool.query('SELECT id,label,is_default,version FROM saved_addresses ORDER BY label')).rows;expect(rows.map(x=>[x.label,x.is_default])).toEqual([['Home',false],['Work',true]]);
  const home=page.getByTestId('address-'+rows[0].id);await home.getByTestId('address-edit').click();await page.getByTestId('address-text').fill('My draft');
  await environment.pool.query('UPDATE saved_addresses SET version=version+1 WHERE id=$1',[rows[0].id]);
  await page.getByTestId('address-save').click();await expect(page.getByRole('alert')).toContainText('Dữ liệu đã thay đổi');await page.getByTestId('account-reload').click();await expect(page.getByTestId('address-text')).toHaveValue('My draft');await page.getByTestId('address-save').click();await expect(home.getByText('My draft')).toBeVisible();
  await page.getByTestId('address-'+rows[1].id).getByTestId('address-archive').click();await page.getByTestId('address-confirm-archive').click();await expect(page.getByTestId('address-default-badge')).toHaveCount(0);await expect(page.getByTestId('address-edit')).toHaveCount(1);
  rows=(await environment.pool.query('SELECT * FROM saved_addresses WHERE archived_at IS NULL')).rows;expect(rows).toHaveLength(1);expect(rows[0].is_default).toBe(false);
  await page.getByRole('button',{name:'Quay lại',exact:true}).click();
  // A second real login is revoked from the app; its access and refresh both fail.
  const apiUrl=environment.apiUrl;
  const other=await (await page.request.post(apiUrl+'/auth/login',{data:{email,password}})).json();
  await page.getByTestId('sessions-open').click();await expect(page.getByText('Phiên hiện tại',{exact:true})).toBeVisible();await page.getByTestId('session-revoke-other').click();await page.getByTestId('session-confirm').click();await expect(page.getByText('Đã thu hồi',{exact:true})).toBeVisible();
  expect((await page.request.get(apiUrl+'/me',{headers:{Authorization:'Bearer '+other.access_token}})).status()).toBe(401);
  expect((await page.request.post(apiUrl+'/auth/refresh',{data:{refresh_token:other.refresh_token}})).status()).toBe(401);
  await page.getByTestId('session-revoke-current').click();await page.getByTestId('session-confirm').click();await expect(page.getByRole('button',{name:'Đăng nhập',exact:true})).toBeVisible();
});
