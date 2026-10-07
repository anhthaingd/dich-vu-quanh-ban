import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HttpException } from '@nestjs/common';
import { databaseFixture } from '../helpers/database.js';
import { GeoapifyProvider } from '../../src/integrations/maps/geoapify.js';
test('location HTTP validates, disables missing provider, preserves envelope, throttles and never logs private query', async () => {
  const fixture = await databaseFixture();
  const call = (action:string,body:unknown) => fetch(fixture.base+'/locations/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  try {
    const unauthorized = await fetch(fixture.base+'/locations/geocode',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer invalid'},body:JSON.stringify({text:'Hanoi',locale:'vi'})});
    assert.equal(unauthorized.status,401);
    const bad = await call('reverse',{locale:'vi',point:{latitude:91,longitude:0}}); assert.equal(bad.status,400);
    assert.equal((await call('geocode',{text:'PRIVATE_ADDRESS_CANARY',locale:'vi'})).status,503);
    const provider=fixture.app.get(GeoapifyProvider);
    provider.lookup=async()=>({items:[{id:'1',text:'Public fixture',point:{latitude:0,longitude:0},precision:'approximate'}],attribution:'Geoapify | OpenStreetMap'});
    const good=await call('autocomplete',{text:'PRIVATE_ADDRESS_CANARY',locale:'vi'}); assert.equal(good.status,200);assert.equal(good.headers.get('cache-control'),'no-store');assert.equal((await good.json()).items[0].point.latitude,0);
    provider.lookup=async()=>{throw new HttpException('Provider busy',429);};const throttled=await call('geocode',{text:'Public',locale:'vi'});assert.equal(throttled.status,429);assert.equal(throttled.headers.get('retry-after'),'60');
    provider.lookup=async()=>{throw new HttpException('Timeout',504);};const timed=await call('reverse',{point:{latitude:21,longitude:105},locale:'vi'});assert.equal(timed.status,504);assert.equal((await timed.json()).code,'TIMEOUT');
    const limited=await call('geocode',{text:'Public',locale:'vi'});assert.equal(limited.status,429);assert.ok(Number(limited.headers.get('retry-after'))>0);
    assert.ok(!fixture.logs.text().includes('PRIVATE_ADDRESS_CANARY'));
  } finally { await fixture.close(); }
});
