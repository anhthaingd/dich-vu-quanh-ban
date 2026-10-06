import { test, expect } from './fixtures.mjs';
test('product header stays reachable, account returns to category and only real navigation is shown', async ({ page, environment }, testInfo) => {
  await page.goto(environment.webUrl);
  const avatar = page.getByRole('button', { name: 'Tài khoản', exact: true });
  await expect(avatar).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(1);
  await expect(page.getByRole('tab', { name: 'Tìm dịch vụ' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Điện nước', exact: true }).click();
  await avatar.click();
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Điện nước', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Tìm dịch vụ' }).click();
  await expect(page.getByRole('heading', { name: 'Bạn cần dịch vụ gì?' })).toBeVisible();
  for (const [width, language] of [[390, 'Tiếng Việt'], [320, '日本語'], [768, 'English']]) {
    await page.setViewportSize({ width, height: 844 });
    await page.getByRole('button', { name: language, exact: true }).click();
    await expect(page.getByRole('button', { name: language, exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`shell-${width}.png`) });
    await page.getByRole('button', { name: language === 'Tiếng Việt' ? 'Vệ sinh' : language === '日本語' ? '清掃' : 'Cleaning', exact: true }).scrollIntoViewIfNeeded();
    const box = await page.getByTestId('nav-account').boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThan(844);
    await page.getByTestId('nav-catalog').click();
  }
});
