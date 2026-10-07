import {test,expect} from './fixtures.mjs';
import {chooseLocation} from './location-helper.mjs';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
test('direct search selects a service, excludes another trade and clears old results when the service changes',async({page,environment})=>{
 const account=await (await page.request.post(environment.apiUrl+'/auth/register',{data:{email:'search-service@example.test',password:'test-search-service-password',display_name:'DEMO service'}})).json();
 await environment.pool.query("INSERT INTO identities(user_id,provider,subject,verified_at) VALUES($1,'phone','+84900000039',now())",[account.user.id]);
 const rows=(await environment.pool.query("SELECT s.id,s.code,c.id category_id,c.parent_id industry_id FROM skills s JOIN skill_categories sc ON sc.skill_id=s.id JOIN categories c ON c.id=sc.category_id WHERE s.code IN ('socket_replacement','water_leak_repair')")).rows;
 expect(rows).toHaveLength(2);
 const socket=rows.find(s=>s.code==='socket_replacement'),other=rows.find(s=>s.code!=='socket_replacement');
 async function provider(name,skill){
  const headers=()=>({Authorization:'Bearer '+account.access_token,'Idempotency-Key':randomUUID()});
  let p=await (await page.request.post(environment.apiUrl+'/partners',{headers:headers(),data:{kind:'solo',name}})).json();
  for(const [action,body] of [['skills',{skills:[{skill_id:skill,modes:['at_customer']}]}],['service-areas',{areas:[{label:'DEMO',center:{latitude:21.0285,longitude:105.8542},radius_m:5000}]}],['publication',{publication_status:'published'}],['availability',{accepting_jobs:true}]]){
   const response=await page.request.put(environment.apiUrl+'/partners/'+p.id+'/'+action,{headers:headers(),data:{...body,expected_version:p.version}});expect(response.status()).toBe(200);p=await response.json();
  }return p;
 }
 const a=await provider('DEMO thợ điện',socket.id),b=await provider('DEMO thợ nước',other.id);
 await page.goto(environment.webUrl);await page.getByTestId('search-open').click();
 await page.getByTestId('search-service-open').click();
 await page.getByTestId('service-category-'+socket.industry_id).click();
 await page.getByTestId('service-category-'+socket.category_id).click();
 await mkdir('docs/ke-hoach-trien-khai/bao-cao/anh/B03-05',{recursive:true});
 await expect(page.getByTestId('service-skill-'+socket.id)).toBeVisible();
 await page.screenshot({path:'docs/ke-hoach-trien-khai/bao-cao/anh/B03-05/web-service-picker.png'});
 await page.getByTestId('service-skill-'+socket.id).click();
 await expect(page.getByTestId('search-service-selected')).not.toHaveText('Tất cả dịch vụ');
 await chooseLocation(page,'search',{latitude:21.0285,longitude:105.8542});
 const request=page.waitForRequest(r=>r.url().includes('/partners?'));
 await page.getByTestId('search-submit').click();
 expect(new URL((await request).url()).searchParams.get('skill_id')).toBe(socket.id);
 await expect(page.getByTestId('search-result-'+a.id)).toBeVisible();await expect(page.getByTestId('search-result-'+b.id)).toHaveCount(0);
 await page.screenshot({path:'docs/ke-hoach-trien-khai/bao-cao/anh/B03-05/web-selected-service.png'});
 await page.getByTestId('search-result-'+a.id).scrollIntoViewIfNeeded();
 await page.screenshot({path:'docs/ke-hoach-trien-khai/bao-cao/anh/B03-05/web-filtered-results.png'});
 await page.getByTestId('search-service-open').click();await page.getByTestId('service-root').click();
 await page.getByTestId('service-category-'+other.industry_id).click();await page.getByTestId('service-category-'+other.category_id).click();await page.getByTestId('service-skill-'+other.id).click();
 await expect(page.getByTestId('search-result-'+a.id)).toHaveCount(0);
 await page.getByTestId('search-submit').click();await expect(page.getByTestId('search-result-'+b.id)).toBeVisible();await expect(page.getByTestId('search-result-'+a.id)).toHaveCount(0);
 await page.getByTestId('search-service-open').click();await page.getByTestId('service-all').click();await page.getByTestId('search-submit').click();
 await expect(page.getByTestId('search-result-'+a.id)).toBeVisible();await expect(page.getByTestId('search-result-'+b.id)).toBeVisible();
});
