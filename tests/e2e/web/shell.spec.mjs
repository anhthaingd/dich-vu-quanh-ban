import { test, expect } from './fixtures.mjs';
test('discovery home follows Storybook layout and real tabs, preserves service selection and supports locales', async ({ page, environment }, testInfo) => {
  await page.goto(environment.webUrl);
  await expect(page.getByRole('tab')).toHaveCount(4);
  await expect(page.getByRole('tab', {name:'Thông báo'})).toBeEnabled();
  await expect(page.getByRole('button',{name:'English',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Điện nước',exact:true}).click();
  await page.getByTestId('nav-account').filter({visible:true}).click();
  await expect(page.getByTestId('auth-email')).toBeVisible();
  await page.getByTestId('nav-back').filter({visible:true}).click();
  await expect(page.getByTestId('search-service-selected')).toHaveText('Điện nước');
  await page.getByTestId('nav-jobs').filter({visible:true}).click();
  await expect(page.getByTestId('account-continue-login')).toBeVisible();
  await expect(page.getByTestId('nav-jobs').filter({visible:true})).toHaveAttribute('aria-selected','true');
  await page.getByTestId('nav-messages').filter({visible:true}).click();
  await expect(page.getByTestId('nav-messages').filter({visible:true})).toHaveAttribute('aria-selected','true');
  await page.getByTestId('nav-catalog').filter({visible:true}).click();
  for (const [width, language] of [[390,'Tiếng Việt'],[320,'日本語'],[768,'English']]) {
    await page.setViewportSize({width,height:844});
    await page.getByTestId('nav-account').filter({visible:true}).click();
    await page.getByRole('button',{name:language,exact:true}).click();
    await expect(page.getByRole('button',{name:language,exact:true})).toHaveAttribute('aria-pressed','true');
    await page.getByTestId('nav-back').filter({visible:true}).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`shell-${width}.png`)});
    const box=await page.getByTestId('nav-account').filter({visible:true}).boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThan(844);
  }
});
