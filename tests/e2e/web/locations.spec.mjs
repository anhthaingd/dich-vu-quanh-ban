import { test, expect } from './fixtures.mjs';
test('choose location, cancel, reject GPS, preserve description and save coordinates to DB', async ({page,environment}) => {
 const point={latitude:21.0254,longitude:105.8465};
 await page.route('https://maps.geoapify.com/**',route=>route.fulfill({json:{version:8,sources:{},layers:[{id:'bg',type:'background',paint:{'background-color':'#e8efe9'}}]}}));
 await page.route('**/v1/locations/*',route=>route.fulfill({json:route.request().url().endsWith('/reverse')?{address:{id:'r',text:'Public map fixture',point,precision:'approximate'},attribution:'fixture'}:{items:[{id:'1',text:'1 Hỏa Lò, Hà Nội',point,precision:'address'}],attribution:'fixture'}}));
 await page.goto(environment.webUrl);await page.getByTestId('search-pick-location').click();
 await expect(page.getByTestId('location-confirm')).toBeDisabled();
 await page.getByTestId('location-query').fill('1 Hỏa Lò');await page.getByTestId('location-result-0').click();
 await page.getByTestId('location-description').fill('1 Hỏa Lò, cổng chính');await page.getByTestId('location-confirm').click();
 await expect(page.getByTestId('search-advanced')).toHaveCount(0);await expect(page.getByText('1 Hỏa Lò, cổng chính',{exact:true})).toBeVisible();
 await page.getByTestId('search-pick-location').click();await page.getByTestId('location-query').fill('another address');await expect(page.getByTestId('location-confirm')).toBeDisabled();await page.getByTestId('location-cancel').click();await expect(page.getByText('1 Hỏa Lò, cổng chính',{exact:true})).toBeVisible();
 await page.getByTestId('search-pick-location').click();await page.getByTestId('location-gps').click();await expect(page.getByText(/Chưa được cấp quyền vị trí/)).toBeVisible();
 if(process.env.MAP_REPORT_SCREENSHOTS==='1')await page.screenshot({path:'docs/ke-hoach-trien-khai/bao-cao/anh/B03-01/web-gps-denied-test.png'});
 await page.getByTestId('location-map').click({position:{x:160,y:150}});await expect(page.getByTestId('location-description')).toHaveValue('Public map fixture');await page.getByTestId('location-confirm').click();
 // Save the same picker result through the actual authenticated address API and DB.
 await page.getByRole('button',{name:'Tài khoản',exact:true}).click();await page.getByTestId('auth-toggle').click();
 await page.getByTestId('auth-name').fill('Map demo');await page.getByTestId('auth-email').fill('map@example.test');await page.getByTestId('auth-password').fill('map-test-password-123');await page.getByTestId('auth-submit').click();
 await page.getByTestId('addresses-open').click();await page.getByTestId('address-add').click();await page.getByTestId('address-label').fill('DEMO public location');
 await page.getByTestId('address-pick-location').click();await page.getByTestId('location-query').fill('Hỏa Lò');await page.getByTestId('location-result-0').click();await page.getByTestId('location-confirm').click();await page.getByTestId('address-save').click();
 await expect(page.getByTestId('address-edit')).toBeVisible();await page.getByTestId('address-edit').click();await expect(page.getByTestId('address-advanced')).toHaveCount(0);
 const saved=(await environment.pool.query('SELECT ST_Y(point::geometry) lat,ST_X(point::geometry) lng FROM saved_addresses WHERE archived_at IS NULL')).rows;expect(saved).toEqual([{lat:point.latitude,lng:point.longitude}]);await expect(page.getByTestId('address-text')).toHaveValue('1 Hỏa Lò, Hà Nội');
 if(process.env.MAP_REPORT_SCREENSHOTS==='1')await page.screenshot({path:'docs/ke-hoach-trien-khai/bao-cao/anh/B03-01/web-saved-address-test.png'});
});
