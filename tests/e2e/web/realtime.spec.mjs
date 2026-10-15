import {test,expect} from './fixtures.mjs';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
test.use({realtime:true});
test('realtime two accounts: visible chat, offline catch-up and inbox read on another session',async({page,browser,environment})=>{
 const password='DEMO realtime password 2026';
 const call=async(token,path,body)=>{const r=await page.request.fetch(environment.apiUrl+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,'Idempotency-Key':randomUUID()},...(body===undefined?{}:{data:body})});expect(r.ok(),await r.text()).toBeTruthy();return r.json();};
 const a=await call('','/auth/register',{email:'a@example.test',password,display_name:'DEMO khách'}),b=await call('','/auth/register',{email:'b@example.test',password,display_name:'DEMO thợ'});
 const [low,high]=[a.user.id,b.user.id].sort();const room=(await environment.pool.query("INSERT INTO conversations(kind,user_low,user_high) VALUES('direct',$1,$2) RETURNING id",[low,high])).rows[0];
 await call(b.access_token,`/conversations/${room.id}/messages`,{client_message_id:randomUUID(),body:'DEMO bắt đầu'});
 // Fixture for an independent non-chat notice; chat itself must never produce one.
 await environment.pool.query("INSERT INTO notifications(user_id,event_key,kind,resource_ref) VALUES($1,'demo-job-notice','job.requested','{}')",[a.user.id]);
 const ctx=await browser.newContext({viewport:{width:390,height:844}}),peer=await ctx.newPage();
 const login=async(p,email)=>{await p.goto(environment.webUrl);await p.getByTestId('nav-messages').filter({visible:true}).click();await p.getByTestId('account-continue-login').filter({visible:true}).click();await p.getByTestId('auth-email').filter({visible:true}).fill(email);await p.getByTestId('auth-password').filter({visible:true}).fill(password);await p.getByTestId('auth-submit').filter({visible:true}).click();await p.getByTestId('conversation-open-'+room.id).filter({visible:true}).click();await expect(p.getByText('DEMO bắt đầu',{exact:true}).filter({visible:true})).toBeVisible();};
 try{
  await login(page,'a@example.test');await login(peer,'b@example.test');
  const latencies=[];
  for(let i=0;i<5;i++){
   const text='DEMO realtime '+i;const start=Date.now();await peer.getByTestId('chat-body').fill(text);await peer.getByTestId('chat-send').click();await expect(page.getByText(text,{exact:true})).toBeVisible({timeout:5000});latencies.push(Date.now()-start);
  }
  await page.context().setOffline(true);await call(b.access_token,`/conversations/${room.id}/messages`,{client_message_id:randomUUID(),body:'DEMO trong lúc mất mạng'});await page.context().setOffline(false);await expect(page.getByText('DEMO trong lúc mất mạng',{exact:true})).toBeVisible({timeout:10000});
  await page.getByTestId('nav-back').filter({visible:true}).click();await page.getByTestId('nav-notifications').filter({visible:true}).click();
  await expect(page.getByTestId('notification-badge').filter({visible:true})).toHaveText('1');
  await expect(page.getByTestId('message-badge').filter({visible:true})).toHaveCount(0);
  await peer.getByTestId('chat-body').fill('DEMO chỉ badge tin nhắn');await peer.getByTestId('chat-send').click();
  await expect(page.getByTestId('message-badge').filter({visible:true})).toHaveText('1',{timeout:5000});
  await expect(page.getByTestId('notification-badge').filter({visible:true})).toHaveText('1');
  expect((await call(a.access_token,'/me/notifications')).items.map(n=>n.kind)).toEqual(['job.requested']);
  await mkdir('test-results/web/report-screenshots/B05-03',{recursive:true});await page.screenshot({path:'test-results/web/report-screenshots/B05-03/web-two-badges.png'});
  const notices=(await call(a.access_token,'/me/notifications')).items;for(const n of notices)await call(a.access_token,`/me/notifications/${n.id}/read`,{});
  await page.getByTestId('notices-unread').filter({visible:true}).click();await expect(page.getByTestId('notices-empty').filter({visible:true})).toBeVisible({timeout:5000});
  await expect(page.getByTestId('notification-badge').filter({visible:true})).toHaveCount(0);
  await expect(page.getByTestId('message-badge').filter({visible:true})).toHaveText('1');
  await page.getByTestId('nav-messages').filter({visible:true}).click();await page.getByTestId('conversation-open-'+room.id).filter({visible:true}).click();
  await expect(page.getByText('DEMO chỉ badge tin nhắn',{exact:true})).toBeVisible();
  await page.getByTestId('nav-back').filter({visible:true}).click();await expect(page.getByTestId('message-badge').filter({visible:true})).toHaveCount(0);
  await mkdir('test-results/web/report-screenshots/B05-02',{recursive:true});await page.screenshot({path:'test-results/web/report-screenshots/B05-02/web-inbox.png'});await peer.screenshot({path:'test-results/web/report-screenshots/B05-02/web-chat.png'});
  await writeFile('test-results/web/report-screenshots/B05-02/latency.json',JSON.stringify({measure:'UI send click to peer visible (includes input); not commit-only',milliseconds:latencies}));
 }finally{await ctx.close();}
});
