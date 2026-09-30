import { test, expect } from './fixtures.mjs';
import { CatalogService } from '../../../services/api/dist/src/modules/catalog/catalog.service.js';
test('catalog journey, offline/retry and empty state use real API/database', async ({ page, context, environment }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(environment.webUrl);
  await page.getByRole('button', { name: 'Điện nước', exact: true }).click();
  await page.getByRole('button', { name: 'Dịch vụ điện nước', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dịch vụ điện nước', exact: true })).toBeVisible();
  // Native stack retains hidden parent screens, which can contain this skill.
  await expect(page.getByText('Sửa điện dân dụng', { exact: true }).filter({ visible: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await context.setOffline(true); await page.getByRole('button', { name: 'Quay lại' }).click();
  await expect(page.getByRole('alert')).toBeVisible(); await context.setOffline(false);
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.getByRole('button', { name: 'Dịch vụ điện nước', exact: true })).toBeVisible();
  await environment.pool.query('UPDATE categories SET active=false'); await page.reload();
  await expect(page.getByText('Chưa có dịch vụ đang hoạt động.')).toBeVisible(); expect(errors).toEqual([]);
});
test('server failure and recovery preserve request correlation', async ({ page, environment }) => {
  const service = environment.app.get(CatalogService); const original = service.list.bind(service);
  service.list = async () => { throw new Error('CANARY'); };
  const failed = page.waitForResponse(response => response.url().includes('/categories'));
  await page.goto(environment.webUrl); await expect(page.getByRole('alert')).toBeVisible();
  const response = await failed; const id = response.headers()['x-request-id'];
  expect(response.status()).toBe(500); expect((await response.json()).correlation_id).toBe(id);
  expect(environment.logs.join('')).toContain(id); expect(environment.logs.join('')).not.toContain('CANARY');
  service.list = original; await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.getByRole('button', { name: 'Điện nước', exact: true })).toBeVisible();
});
