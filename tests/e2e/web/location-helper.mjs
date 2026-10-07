export async function chooseLocation(page, prefix, point, text = 'DEMO public address') {
  await page.route('https://maps.geoapify.com/**', r => r.fulfill({json:{version:8,sources:{},layers:[{id:'bg',type:'background',paint:{'background-color':'#e8efe9'}}]}}));
  await page.route('**/v1/locations/*', r => r.fulfill({json:{items:[{id:'demo',text,point,precision:'address'}],attribution:'test fixture'}}));
  await page.getByTestId(`${prefix}-pick-location`).click();
  await page.getByTestId('location-query').fill(text);
  await page.getByTestId('location-search').click();
  await page.getByTestId('location-result-0').click();
  await page.getByTestId('location-confirm').click();
}
