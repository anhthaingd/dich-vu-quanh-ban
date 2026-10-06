import { test, expect } from './fixtures.mjs';
test('profile persists to DB, protects concurrent edits and replays a lost response across locales', async ({ page, environment }) => {
  await page.goto(environment.webUrl);
  await page.getByTestId('nav-account').click(); await page.getByTestId('auth-toggle').click();
  await page.getByTestId('auth-name').fill('Original'); await page.getByTestId('auth-email').fill('profile-web@example.test');
  await page.getByTestId('auth-password').fill('web-test-only-password'); await page.getByTestId('auth-submit').click();
  await page.getByTestId('profile-open').click();
  await expect(page.getByTestId('profile-name')).toHaveValue('Original');
  await page.getByTestId('profile-name').fill('My draft');
  await page.getByRole('button', { name: 'English', exact: true }).click(); await expect(page.getByTestId('profile-name')).toHaveValue('My draft');
  await page.getByRole('button', { name: '日本語', exact: true }).click(); await expect(page.getByTestId('profile-name')).toHaveValue('My draft');
  await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
  // Represent a second authenticated device changing this same row.
  await environment.pool.query("UPDATE users SET display_name='Other device',version=version+1");
  await page.getByTestId('profile-save').click(); await expect(page.getByRole('alert')).toContainText('Hồ sơ đã thay đổi');
  await page.getByTestId('profile-reload').click(); await expect(page.getByText('Tên đang lưu: Other device')).toBeVisible();
  await expect(page.getByTestId('profile-name')).toHaveValue('My draft');
  const attempts = [];
  await page.route('**/v1/me', async route => {
    if (route.request().method() !== 'PATCH') { await route.continue(); return; }
    attempts.push({ key: route.request().headers()['idempotency-key'], input: route.request().postDataJSON() });
    if (attempts.length === 1) { await route.fetch(); await route.abort('failed'); }
    else await route.continue();
  });
  await page.getByTestId('profile-save').click(); await expect(page.getByRole('alert')).toContainText('Chưa thể hoàn tất');
  await expect(page.getByTestId('profile-name')).not.toBeEditable();
  await page.getByTestId('profile-save').click(); await expect(page.getByTestId('profile-saved')).toBeVisible();
  expect(attempts).toHaveLength(2); expect(attempts[0]).toEqual(attempts[1]);
  expect((await environment.pool.query('SELECT display_name,version FROM users')).rows[0]).toEqual({ display_name: 'My draft', version: 3 });
  expect((await environment.pool.query('SELECT count(*)::int n FROM idempotency_keys')).rows[0].n).toBe(1);
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click(); await expect(page.getByText('My draft', { exact: true })).toBeVisible();
  await page.getByTestId('auth-logout').click();
  await page.getByTestId('auth-toggle').click(); await page.getByTestId('auth-email').fill('profile-web@example.test');
  await page.getByTestId('auth-password').fill('web-test-only-password'); await page.getByTestId('auth-submit').click();
  await expect(page.getByText('My draft', { exact: true })).toBeVisible();
});
