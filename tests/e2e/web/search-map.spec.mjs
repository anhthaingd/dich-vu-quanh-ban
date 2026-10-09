import {chooseLocation} from './location-helper.mjs';
import {test,expect} from './fixtures.mjs';
import {randomUUID} from 'node:crypto';
test('public result pins open profiles, coincident providers stay reachable, private-only providers remain listed',async({page,environment})=>{
 const registered=await page.request.post(environment.apiUrl+'/auth/register',{data:{email:'map-provider@example.test',password:'test-map-provider-password',display_name:'MAP DEMO'}});
 const account=await registered.json();await environment.pool.query("INSERT INTO identities(user_id,provider,subject,verified_at) VALUES($1,'phone','+84900000031',now())",[account.user.id]);
 const point={latitude:21.0285,longitude:105.8542};
 async function provider(name,isPublic){
  const headers=()=>({Authorization:'Bearer '+account.access_token,'Idempotency-Key':randomUUID()});
  let p=await (await page.request.post(environment.apiUrl+'/partners',{headers:headers(),data:{kind:'solo',name}})).json();
  const skill=(await environment.pool.query("SELECT id FROM skills WHERE code='socket_replacement'")).rows[0].id;
  for(const [action,body] of [['skills',{skills:[{skill_id:skill,modes:['at_customer']}]}],['service-areas',{areas:[{label:'PRIVATE CENTER',center:point,radius_m:5000}]}],['locations',{locations:[{address:{text:isPublic?'DEMO public location':'PRIVATE_CANARY',point:{latitude:21.0305,longitude:105.8552}},public:isPublic}]}],['publication',{publication_status:'published'}],['availability',{accepting_jobs:true}]]){
   const response=await page.request.put(environment.apiUrl+'/partners/'+p.id+'/'+action,{headers:headers(),data:{...body,expected_version:p.version}});expect(response.status()).toBe(200);p=await response.json();
  }
  return p;
 }
 const a=await provider('DEMO Public A',true),b=await provider('DEMO Public B',true),privateOnly=await provider('DEMO no public point',false);
 await page.route('https://maps.geoapify.com/**',r=>r.fulfill({json:{version:8,sources:{},layers:[{id:'bg',type:'background',paint:{'background-color':'#e8efe9'}}]}}));
 await page.goto(environment.webUrl);await chooseLocation(page,'search',{latitude:21.0285,longitude:105.8542});await page.getByTestId('search-submit').click();
 await page.getByTestId('search-view-map').click();const pin=page.getByRole('button',{name:/DEMO Public A, DEMO Public B|DEMO Public B, DEMO Public A/});await expect(pin).toHaveText('2×');await pin.click();
 await expect(page.getByTestId('map-selected-'+a.id)).toBeVisible();await expect(page.getByTestId('map-selected-'+b.id)).toBeVisible();await expect(page.getByTestId('search-result-'+privateOnly.id)).toBeVisible();await expect(page.getByText('PRIVATE_CANARY')).toHaveCount(0);
 await page.getByTestId('map-selected-'+a.id).getByRole('button',{name:'Xem hồ sơ',exact:true}).click();await expect(page.getByText('DEMO Public A',{exact:true}).filter({visible:true})).toBeVisible();
 await page.getByRole('button',{name:'Quay lại',exact:true}).click();await page.getByTestId('search-view-list').click();await expect(page.getByTestId('search-result-'+a.id)).toBeVisible();
 await chooseLocation(page,'search',{latitude:10,longitude:105.8542});await expect(page.getByTestId('search-result-'+a.id)).toHaveCount(0);await expect(page.getByTestId('search-results-map')).toHaveCount(0);
});
