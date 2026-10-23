import {test,expect} from './fixtures.mjs';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
test.use({financeLocal:true});
test('local role selection keeps partner scope across tabs, excludes employee wallet and clears on logout',async({page,environment})=>{
 test.setTimeout(150000);const password='DEMO local role password 2026';
 const call=async(token,path,data)=>{const r=await page.request.post(environment.apiUrl+path,{headers:{...(token?{Authorization:'Bearer '+token}:{}),'Idempotency-Key':randomUUID()},data});expect(r.ok(),await r.text()).toBeTruthy();return r.json();};
 const a=await call(null,'/auth/register',{email:'role@example.test',password,display_name:'DEMO roles'});
 await environment.pool.query("INSERT INTO identities(user_id,provider,subject,verified_at) VALUES($1,'phone','+84900111222',now())",[a.user.id]);
 const partner=await call(a.access_token,'/partners',{kind:'solo',name:'DEMO owned profile'});
 const employeePartner=(await environment.pool.query("INSERT INTO partners(kind,name) VALUES('shop','DEMO employee shop') RETURNING id")).rows[0].id;
 await environment.pool.query('INSERT INTO memberships(partner_id,user_id) VALUES($1,$2)',[employeePartner,a.user.id]);
 await page.goto(environment.webUrl);await page.getByTestId('nav-account').click();await page.getByTestId('auth-email').fill('role@example.test');await page.getByTestId('auth-password').fill(password);await page.getByTestId('auth-submit').click();await page.getByTestId('role-profiles').filter({visible:true}).click();
 await page.getByTestId('role-select-'+partner.id).click();await expect(page.getByTestId('nav-wallet').filter({visible:true})).toBeVisible();await expect(page.getByTestId('nav-catalog').filter({visible:true})).toHaveCount(0);
 await page.getByTestId('nav-wallet').filter({visible:true}).click();await expect(page.getByTestId('finance-bank')).toBeVisible();
 const dir='test-results/web/report-screenshots/LOCAL-01';await mkdir(dir,{recursive:true});await page.screenshot({path:dir+'/owner-wallet.png',fullPage:true});
 for(const locale of ['en','ja','vi']){await page.getByTestId('nav-account').filter({visible:true}).click();await page.getByTestId('locale-'+locale).filter({visible:true}).click();await page.getByTestId('nav-back').filter({visible:true}).click();await expect(page.getByTestId('nav-wallet').filter({visible:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);}
 await page.getByTestId('nav-account').filter({visible:true}).click();await page.getByTestId('role-profiles').filter({visible:true}).click();await page.getByTestId('role-select-'+employeePartner).filter({visible:true}).click();await expect(page.getByTestId('nav-wallet').filter({visible:true})).toHaveCount(0);await expect(page.getByRole('tab').filter({visible:true})).toHaveCount(3);await expect(page.getByTestId('jobs-partner-'+employeePartner).filter({visible:true})).toHaveText('Việc của DEMO employee shop');await page.screenshot({path:dir+'/employee-tabs.png',fullPage:true});
 await page.context().setOffline(true);await page.getByTestId('jobs-reload').filter({visible:true}).click();await expect(page.getByRole('alert').filter({visible:true})).toBeVisible();await page.context().setOffline(false);await page.getByTestId('jobs-reload').filter({visible:true}).click();await expect(page.getByRole('alert').filter({visible:true})).toHaveCount(0);
 await page.getByTestId('nav-account').filter({visible:true}).click();await page.getByTestId('auth-logout').filter({visible:true}).click();await expect(page.getByTestId('auth-email').filter({visible:true})).toBeVisible();await page.getByTestId('nav-back').filter({visible:true}).click();await expect(page.getByTestId('nav-catalog').filter({visible:true})).toBeVisible();await expect(page.getByTestId('nav-wallet').filter({visible:true})).toHaveCount(0);
});
