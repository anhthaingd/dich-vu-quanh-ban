import {test,expect} from './fixtures.mjs';
import {AuthService} from '../../../services/api/dist/src/modules/auth/auth.service.js';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
test('a second signed-in device observes the accepted call without failing the first device',async({page,environment})=>{
 const account=await environment.app.get(AuthService).register('device@example.test','DEMO devices password','DEMO device');
 const call={id:'00000000-0000-4000-8000-000000000024',job_id:'00000000-0000-4000-8000-000000000021',conversation_id:'00000000-0000-4000-8000-000000000022',caller_id:'00000000-0000-4000-8000-000000000023',recipient_id:account.user.id,state:'accepted',version:2,created_at:new Date().toISOString(),ring_until:new Date(Date.now()+30000).toISOString(),answered_at:new Date().toISOString(),ended_at:null};
 let writes=0,heartbeats=0,reads=0;
 // Auth/API/DB are real test fixtures. Call responses model the existing server family-binding rule.
 await page.route('**/v1/calls**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/media'))return route.fulfill({status:403,json:{code:'FORBIDDEN'}});
  if(path.endsWith('/heartbeat')){heartbeats++;return route.fulfill({status:403,json:{code:'FORBIDDEN'}});}
  if(path.endsWith('/actions')){writes++;return route.fulfill({status:409,json:{code:'STATE_CONFLICT'}});}
  if(path.endsWith('/calls'))return route.fulfill({json:{items:[call],next_cursor:null}});
  reads++;return route.fulfill({json:call});
 });
 await page.goto(environment.webUrl);await page.getByTestId('nav-account').click();await page.getByTestId('auth-email').fill('device@example.test');await page.getByTestId('auth-password').fill('DEMO devices password');await page.getByTestId('auth-submit').click();
 await expect(page.getByTestId('call-state')).toHaveText('Cuộc gọi đang ở thiết bị khác.');
 await expect.poll(()=>reads).toBeGreaterThanOrEqual(3);
 expect(writes).toBe(0);expect(heartbeats).toBe(0);await expect(page.getByTestId('call-end')).toHaveCount(0);
 await mkdir(resolve('test-results/web/report-screenshots/B00-24'),{recursive:true});
 await page.screenshot({path:resolve('test-results/web/report-screenshots/B00-24/call-on-other-device.png'),fullPage:true});
 await page.getByTestId('call-close').click();await expect(page.getByTestId('call-state')).not.toBeVisible();expect(writes).toBe(0);
});
