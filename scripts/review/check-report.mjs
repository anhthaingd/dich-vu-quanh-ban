import {chromium} from 'playwright';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const directory=resolve('.local/seed-operational/report-check');await mkdir(directory,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage(),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
const url=pathToFileURL(resolve('docs/ke-hoach-trien-khai/bao-cao/B00-14-bao-cao-man-hinh.html')).href;
try{
 await page.goto(url);await page.locator('h2').waitFor();
 const data=await page.evaluate(()=>window.reportData);
 assert.equal(data.date,'04/11/2026');assert.equal(data.screens.length,134);
 const evidence=JSON.parse(await readFile('docs/ke-hoach-trien-khai/bao-cao/bang-chung/B00-14-native.json','utf8'));
 assert.equal(evidence.entries.length,268);assert.equal(new Set(evidence.entries.map(e=>e.platform+':'+e.key)).size,268);
 for(const entry of evidence.entries){
  const screen=data.screens.find(s=>s.key===entry.key);assert.ok(screen,entry.key);
  assert.ok(['captured','captured-with-issue','blocked'].includes(entry.status));
  assert.ok(entry.role&&entry.checkedAt);assert.equal(screen.images[entry.platform],entry.image||null);
  if(entry.status==='captured-with-issue'){assert.ok(entry.reason&&entry.issueIds?.length);for(const id of entry.issueIds)assert.ok(evidence.issues.some(issue=>issue.id===id));}
  if(entry.image){assert.ok(entry.image.startsWith('anh/B00-14-UX01/'));const bytes=await readFile(resolve('docs/ke-hoach-trien-khai/bao-cao',entry.image));assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256,entry.image);}
  else assert.ok(entry.status==='blocked'&&entry.reason&&entry.attempts?.length,entry.key+' needs a concrete blocking reason and attempt evidence');
 }
 for(const entry of evidence.supplemental){assert.ok(entry.image.startsWith('anh/B00-14-UX01/'));const bytes=await readFile(resolve('docs/ke-hoach-trien-khai/bao-cao',entry.image));assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);}
 assert.ok(!data.screens.find(s=>s.key==='customer-invoice-completed').buttons.some(b=>['Đánh giá','Xác nhận hóa đơn'].includes(b[0])));
 assert.ok(!data.screens.find(s=>s.key==='owner-invoice-sent').buttons.some(b=>b[0]==='Lưu nháp'));
 checks.push('All 134 items / 268 platform slots have current capture evidence or a documented blocking reason; image SHA-256 verified');
 await page.locator('#q').fill('hoa don');assert.ok(await page.locator('.step').count()>4);assert.match(await page.locator('h2').textContent(),/hóa đơn/i);checks.push('Vietnamese accent-insensitive search');
 await page.locator('#reset').click();await page.locator('#role').selectOption('admin');await page.locator('#permission').selectOption('finance.read');assert.ok(await page.locator('.step').count()>0);assert.equal(await page.locator('.step').filter({hasText:'Tài khoản'}).count(),0);checks.push('Combined role and permission filters');
 await page.locator('#role').selectOption('guest');assert.equal(await page.locator('.empty').count(),1);await page.locator('[data-reset]').click();checks.push('Empty combination and recovery');
 await page.locator('#flow').selectOption('account');const first=await page.locator('h2').textContent();await page.locator('[data-next]').click();assert.notEqual(await page.locator('h2').textContent(),first);const selected=await page.locator('h2').textContent();await page.reload();assert.equal(await page.locator('h2').textContent(),selected);await page.locator('[data-first]').click();assert.equal(await page.locator('h2').textContent(),first);checks.push('Previous/next/start and URL restoration');
 await page.locator('#reset').click();await page.locator('#evidence').selectOption('both');assert.ok(await page.locator('.step').count()>0);assert.equal(await page.locator('.photos img').count(),2);await page.locator('.photos img').first().click();assert.equal(await page.locator('dialog[open]').count(),1);await page.keyboard.press('Escape');await page.locator('#device').selectOption('ios');assert.equal(await page.locator('.photos img').count(),1);checks.push('Side-by-side, one device, image zoom and Escape');
 await page.locator('#evidence').selectOption('missing');const missing=await page.locator('.step').count();if(missing)assert.equal(await page.locator('.photos img').count(),0);await page.locator('#evidence').selectOption('any');assert.equal(await page.locator('.photos img').count(),1);checks.push('Evidence filters follow the selected platform');
 for(const device of ['compare','android','ios'])for(const status of ['blocked','issue']){await page.locator('#reset').click();await page.locator('#device').selectOption(device);await page.locator('#evidence').selectOption(status);const platforms=device==='compare'?['android','ios']:[device],expected=data.screens.filter(s=>platforms.some(p=>s.evidence[p].status===(status==='blocked'?'blocked':'captured-with-issue'))).length;assert.equal(await page.locator('.step').count(),expected);}checks.push('Blocked and issue filters match compare/Android/iOS evidence independently');
 await page.locator('#reset').click();
 await page.locator('#catalog').click();assert.ok(await page.locator('.tile').count()>0);await page.locator('.tile').first().click();assert.equal(await page.locator('.detail').count(),1);checks.push('Catalog to guided detail');
 await page.locator('#reset').click();
 await page.locator('#q').fill('giu vi tri doc');assert.ok(await page.locator('.step').count()>0);checks.push('Search includes updated behavior notes');
 await page.locator('#reset').click();await page.locator('#q').fill('bo loc tim dich vu');await page.locator('[data-jump="search-results"]').first().click();assert.equal(await page.locator('h2').textContent(),'Kết quả tìm dịch vụ');checks.push('Updated filter action links to search results');
 await page.locator('#reset').click();
 for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'overflow '+width);await page.screenshot({path:directory+'/'+width+'.png',fullPage:false});}checks.push('No horizontal overflow at 1440/768/390/320');
 const images=[...await page.evaluate(()=>window.reportData.screens.flatMap(s=>Object.values(s.images).filter(Boolean))),...evidence.supplemental.map(e=>e.image)];
 for(const src of images){const okay=await page.evaluate(src=>new Promise(done=>{const img=new window.Image();img.onload=()=>done(img.naturalWidth>0);img.onerror=()=>done(false);img.src=src;}),src);assert.equal(okay,true,src);}checks.push(images.length+' local screenshot links load');
 assert.deepEqual(errors,[]);checks.push('No browser page errors');
 await writeFile(directory+'/result.json',JSON.stringify({status:'PASS',checkedAt:new Date().toISOString(),checks,errors},null,2));console.log(JSON.stringify({status:'PASS',checks}));
}finally{await browser.close();}
