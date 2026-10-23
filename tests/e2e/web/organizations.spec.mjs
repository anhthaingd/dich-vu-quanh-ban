import {test,expect} from './fixtures.mjs';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import {MessageSecrets} from '../../../services/api/dist/src/integrations/local-messages.js';
test.use({teamLocal:true});
test('team: local verification, invitation, permissions and departure across two accounts',async({page,browser,environment})=>{
 test.setTimeout(180000);const password='DEMO team password 2026',secret=new MessageSecrets('web-local-messages-secret-'.repeat(3));
 const call=async(token,path,method='GET',data)=>{const r=await page.request.fetch(environment.apiUrl+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),'Idempotency-Key':randomUUID()},...(data?{data}:{})});expect(r.ok(),await r.text()).toBeTruthy();return r.json();};
 const owner=await call(null,'/auth/register','POST',{email:'owner@example.test',display_name:'DEMO chủ đội',password});
 await call(null,'/auth/register','POST',{email:'worker@example.test',display_name:'DEMO nhân viên',password});
 const getCode=async(user)=>{const d=(await environment.pool.query('SELECT d.payload_cipher FROM local_deliveries d JOIN auth_challenges c ON c.id=d.challenge_id WHERE c.user_id=$1 ORDER BY c.created_at DESC LIMIT 1',[user])).rows[0];return JSON.parse(secret.decrypt(d.payload_cipher)).text.match(/\d{6}/)[0];};
 const c=await call(owner.access_token,'/auth/challenges','POST',{contact:'+84900000001',purpose:'verify'});await call(owner.access_token,'/auth/challenges/verify','POST',{challenge_id:c.id,code:await getCode(owner.user.id)});
 const p=await call(owner.access_token,'/partners','POST',{kind:'company',name:'DEMO đội sửa điện'});
 const signIn=async(tab,email)=>{await tab.goto(environment.webUrl);await tab.getByTestId('nav-account').click();await tab.getByTestId('auth-email').fill(email);await tab.getByTestId('auth-password').fill(password);await tab.getByTestId('auth-submit').click();await expect(tab.getByTestId('team-open')).toBeVisible();};
 const context=await browser.newContext({viewport:{width:390,height:844}}),employee=await context.newPage();
 const dir='test-results/web/report-screenshots/B04-01';await mkdir(dir,{recursive:true});
 try{
  await signIn(page,'owner@example.test');await page.getByTestId('team-open').click();await page.getByTestId('team-open-'+p.id).click();await page.getByTestId('team-invite-open').click();await page.getByTestId('team-invite-contact').fill('worker@example.test');await page.screenshot({path:dir+'/web-invite.png'});await page.getByTestId('team-invite-submit').click();await expect(page.getByText('Chờ tham gia',{exact:true})).toBeVisible();
  const row=(await environment.pool.query('SELECT d.payload_cipher FROM local_deliveries d JOIN member_invitations i ON i.id=d.invitation_id WHERE i.partner_id=$1',[p.id])).rows[0],token=JSON.parse(secret.decrypt(row.payload_cipher)).text.match(/[a-f0-9]{64}/)[0];
  await signIn(employee,'worker@example.test');await employee.getByTestId('verify-open').click();await employee.getByTestId('verify-contact').fill('worker@example.test');await employee.getByTestId('verify-send').click();await expect(employee.getByTestId('verify-code')).toBeVisible();
  const worker=(await environment.pool.query("SELECT user_id FROM identities WHERE subject='worker@example.test'")).rows[0];await employee.getByTestId('verify-code').fill(await getCode(worker.user_id));await employee.getByTestId('verify-confirm').click();await expect(employee.getByTestId('verify-done')).toBeVisible();await employee.screenshot({path:dir+'/web-verified.png'});
  await employee.getByRole('button',{name:'Quay lại',exact:true}).click();await employee.getByTestId('team-open').click();await employee.getByTestId('team-token').fill(token);await expect(employee.getByTestId('team-token')).toHaveValue(token);await employee.getByTestId('team-accept').click();await expect(employee.getByText('DEMO đội sửa điện',{exact:true})).toBeVisible();await expect(employee.getByTestId('team-token')).toHaveValue('');
  const m=(await environment.pool.query('SELECT id FROM memberships WHERE partner_id=$1 AND user_id=$2',[p.id,worker.user_id])).rows[0];
  await page.getByTestId('team-tab-members').click();await page.getByTestId('team-reload').click();await expect(page.getByText('DEMO nhân viên',{exact:true}).first()).toBeVisible();await page.screenshot({path:dir+'/web-team.png'});
  await page.getByTestId('team-tab-permissions').click();await page.getByTestId('team-grants-'+m.id).click();await page.getByTestId('grant-jobs.assign').click();await page.getByTestId('team-grant-reason').fill('DEMO giao quyền phân công');await page.getByTestId('team-grant-password').fill(password);await page.getByTestId('team-grant-save').click();await expect(page.getByTestId('team-grant-save')).toHaveCount(0);await expect(page.getByText('Đã cập nhật.',{exact:true})).toBeVisible();
  const grants=(await environment.pool.query('SELECT permission FROM membership_grants WHERE membership_id=$1 AND revoked_at IS NULL',[m.id])).rows;expect(grants.map(g=>g.permission)).toEqual(['jobs.assign']);
  await employee.getByTestId('memberships-reload').click();await employee.getByTestId('team-leave-'+m.id).click();await expect(employee.getByText('0 việc cần phân công lại.',{exact:true})).toBeVisible();await employee.getByTestId('team-leave-reason').fill('DEMO kết thúc hợp tác');await employee.screenshot({path:dir+'/web-departure.png'});await employee.getByTestId('team-leave-confirm').click();await expect(employee.getByText('Đã rời',{exact:true})).toBeVisible();
  expect((await environment.pool.query('SELECT active FROM memberships WHERE id=$1',[m.id])).rows[0].active).toBe(false);
 }finally{await context.close();}
});
