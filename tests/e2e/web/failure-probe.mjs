import { test, expect } from './fixtures.mjs';
test('deliberate failure emits debugging artifacts when explicitly requested', async ({ page, environment }) => {
  await page.goto(environment.webUrl); await expect(page.getByText('DELIBERATE_FAILURE_SENTINEL')).toBeVisible({ timeout: 1000 });
});
