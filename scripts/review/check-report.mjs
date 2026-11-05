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
 assert.equal(data.date,'05/11/2026');assert.equal(data.screens.length,141);
 const evidence=JSON.parse(await readFile('docs/ke-hoach-trien-khai/bao-cao/bang-chung/B00-14-native.json','utf8'));
 assert.equal(evidence.entries.length,282);assert.equal(new Set(evidence.entries.map(e=>e.platform+':'+e.key)).size,282);
 for(const entry of evidence.entries){
  const screen=data.screens.find(s=>s.key===entry.key);assert.ok(screen,entry.key);
  assert.ok(['captured','captured-with-issue','blocked','historical','not-captured'].includes(entry.status));
  assert.ok(entry.role&&entry.checkedAt);assert.equal(screen.images[entry.platform],entry.image||null);
  if(entry.status==='captured-with-issue'){assert.ok(entry.reason&&entry.issueIds?.length);for(const id of entry.issueIds)assert.ok(evidence.issues.some(issue=>issue.id===id));}
  if(entry.image){assert.ok(/^anh\/(B00-14-UX01|B00-14-UX02|B00-19)\//.test(entry.image));const bytes=await readFile(resolve('docs/ke-hoach-trien-khai/bao-cao',entry.image));assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256,entry.image);}
  else if(entry.status==='blocked')assert.ok(entry.reason&&entry.attempts?.length,entry.key+' needs a concrete blocking reason and attempt evidence');
  else assert.ok(entry.status==='not-captured'&&entry.reason,entry.key+' needs an honest missing capture note');
  if(entry.status==='historical')assert.ok(entry.image&&entry.reason);
 }
 for(const entry of evidence.supplemental){assert.ok(/^anh\/(B00-14-UX01|B00-14-UX02|B00-19)\//.test(entry.image));const bytes=await readFile(resolve('docs/ke-hoach-trien-khai/bao-cao',entry.image));assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);}
 assert.equal(evidence.coverage.capturedSlots,282);assert.equal(evidence.coverage.historicalSlots,0);assert.equal(evidence.coverage.notCapturedSlots,0);
 assert.equal(evidence.recapture.images,80);assert.equal(evidence.entries.filter(e=>e.key.startsWith('admin-')||['account','owner-account','employee-account'].includes(e.key)).length,80);for(const e of evidence.entries.filter(e=>e.key.startsWith('admin-')||['account','owner-account','employee-account'].includes(e.key))){assert.equal(e.status,'captured');assert.ok(e.image.startsWith('anh/B00-14-UX02/'));assert.equal(e.checkedAt,'05/11/2026');assert.equal(e.database,'dvqb_local');}checks.push('All 80 UX-02 admin/account slots use the new native capture directory, with no historical image fallback');
 for(const e of evidence.web){const bytes=await readFile(resolve('docs/ke-hoach-trien-khai/bao-cao',e.image));assert.equal(createHash('sha256').update(bytes).digest('hex'),e.sha256);assert.ok(data.screens.find(s=>s.key===e.key).webCaptures.some(w=>w.image===e.image));}
 assert.ok(!data.screens.find(s=>s.key==='customer-invoice-completed').buttons.some(b=>['Đánh giá','Xác nhận hóa đơn'].includes(b[0])));
 assert.ok(!data.screens.find(s=>s.key==='owner-invoice-sent').buttons.some(b=>b[0]==='Lưu nháp'));
 checks.push('All 141 items / 282 native slots distinguish current, historical and not-captured evidence; image SHA-256 verified');
 await page.locator('#role').selectOption('admin');await page.locator('[data-select="admin-overview"]').click();assert.equal(await page.locator('.web-evidence img').count(),2);await page.locator('[data-jump="admin-reports"]').first().click();assert.match(await page.locator('h2').textContent(),/hỗ trợ/);await page.locator('#reset').click();await page.locator('#q').fill('loi moi');await page.locator('[data-select="admin-invite-review"]').click();assert.equal(await page.locator('.web-evidence img').count(),1);assert.equal(await page.locator('.photos img').count(),2);assert.equal(await page.locator('.photos .missing').count(),0);await page.locator('[data-jump="admin-invitations"]').first().click();assert.equal(await page.locator('.photos img').count(),2);await page.locator('#reset').click();checks.push('UX-02 overview, invitation flow, separate web evidence and current native images');
 await page.locator('#q').fill('hoa don');assert.ok(await page.locator('.step').count()>4);assert.match(await page.locator('h2').textContent(),/hóa đơn/i);checks.push('Vietnamese accent-insensitive search');
 await page.locator('#reset').click();await page.locator('#role').selectOption('admin');await page.locator('#permission').selectOption('finance.read');assert.ok(await page.locator('.step').count()>0);assert.equal(await page.locator('.step').filter({hasText:'Tài khoản'}).count(),0);checks.push('Combined role and permission filters');
 await page.locator('#role').selectOption('guest');assert.equal(await page.locator('.empty').count(),1);await page.locator('[data-reset]').click();checks.push('Empty combination and recovery');
 await page.locator('#flow').selectOption('account');const first=await page.locator('h2').textContent();await page.locator('[data-next]').click();assert.notEqual(await page.locator('h2').textContent(),first);const selected=await page.locator('h2').textContent();await page.reload();assert.equal(await page.locator('h2').textContent(),selected);await page.locator('[data-first]').click();assert.equal(await page.locator('h2').textContent(),first);checks.push('Previous/next/start and URL restoration');
 await page.locator('#reset').click();await page.locator('#evidence').selectOption('both');assert.equal(await page.locator('.step').count(),141);assert.equal(await page.locator('.photos img').count(),2);await page.locator('.photos img').first().click();assert.equal(await page.locator('dialog[open]').count(),1);await page.keyboard.press('Escape');await page.locator('#device').selectOption('ios');assert.equal(await page.locator('.photos img').count(),1);checks.push('Side-by-side, one device, image zoom and Escape');
 await page.locator('#evidence').selectOption('missing');const missing=await page.locator('.step').count();if(missing){const key=await page.evaluate(()=>new window.URLSearchParams(window.location.hash.slice(1)).get('screen'));assert.ok(!['captured','captured-with-issue'].includes(data.screens.find(s=>s.key===key).evidence.ios.status));}await page.locator('#evidence').selectOption('any');assert.equal(await page.locator('.photos img').count(),1);checks.push('Evidence filters follow the selected platform');
 for(const device of ['compare','android','ios'])for(const status of ['blocked','issue','historical']){await page.locator('#reset').click();await page.locator('#device').selectOption(device);await page.locator('#evidence').selectOption(status);const platforms=device==='compare'?['android','ios']:[device],expected=data.screens.filter(s=>platforms.some(p=>s.evidence[p].status===(status==='issue'?'captured-with-issue':status))).length;assert.equal(await page.locator('.step').count(),expected);}checks.push('Blocked and issue filters match compare/Android/iOS evidence independently');
 await page.locator('#reset').click();
 await page.locator('#catalog').click();assert.ok(await page.locator('.tile').count()>0);await page.locator('.tile').first().click();assert.equal(await page.locator('.detail').count(),1);checks.push('Catalog to guided detail');
 await page.locator('#reset').click();
 await page.locator('#q').fill('giu vi tri doc');assert.ok(await page.locator('.step').count()>0);checks.push('Search includes updated behavior notes');
 await page.locator('#reset').click();await page.locator('#q').fill('bo loc tim dich vu');await page.locator('[data-jump="search-results"]').first().click();assert.equal(await page.locator('h2').textContent(),'Kết quả tìm dịch vụ');checks.push('Updated filter action links to search results');
 await page.locator('#reset').click();
 for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'overflow '+width);await page.screenshot({path:directory+'/'+width+'.png',fullPage:false});}checks.push('No horizontal overflow at 1440/768/390/320');
 await page.locator('#reset').click();await page.locator('#role').selectOption('admin');await page.locator('[data-select="admin-overview"]').click();for(const width of [1440,390,320]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'UX-02 overflow '+width);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:directory+'/ux02-'+width+'.png',fullPage:false});}checks.push('UX-02 native comparison and web evidence fit desktop and phone widths');
 const images=[...await page.evaluate(()=>window.reportData.screens.flatMap(s=>Object.values(s.images).filter(Boolean))),...evidence.supplemental.map(e=>e.image),...(evidence.web??[]).map(e=>e.image)];
 for(const src of images){const okay=await page.evaluate(src=>new Promise(done=>{const img=new window.Image();img.onload=()=>done(img.naturalWidth>0);img.onerror=()=>done(false);img.src=src;}),src);assert.equal(okay,true,src);}checks.push(images.length+' local screenshot links load');
 assert.deepEqual(errors,[]);checks.push('No browser page errors');
 await writeFile(directory+'/result.json',JSON.stringify({status:'PASS',checkedAt:new Date().toISOString(),checks,errors},null,2));console.log(JSON.stringify({status:'PASS',checks}));
}finally{await browser.close();}
