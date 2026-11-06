import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HttpException } from '@nestjs/common';
import { databaseFixture } from '../helpers/database.js';
import { GeoapifyProvider } from '../../src/integrations/maps/geoapify.js';
import { LocationLimit } from '../../src/modules/locations/locations.limit.js';
import { createApp } from '../../src/bootstrap.js';
import { captureLogs } from '../helpers/logs.js';
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

test('location HTTP isolates trusted proxy clients and ignores spoofed forwarding when proxy trust is disabled', async () => {
  for (const trustProxy of [true,false]) {
    const fixture=await databaseFixture(undefined,false,undefined,false,undefined,{trustProxy});
    try {
      let now=0;
      const limiter=new LocationLimit(()=>now);
      fixture.app.get(LocationLimit).take=actor=>limiter.take(actor);
      fixture.app.get(GeoapifyProvider).lookup=async()=>({items:[],attribution:'Test provider'});
      const call=async(forwarded:string)=>{
        now+=1500; // Exercise the per-client minute limit without exhausting the global burst limit.
        return fetch(fixture.base+'/locations/autocomplete',{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-For':forwarded},body:JSON.stringify({text:'Hanoi',locale:'vi'})});
      };
      for(let i=0;i<30;i++)assert.equal((await call(`203.0.113.${i+1}, 198.51.100.1`)).status,200);
      // ALB appends the real client address. Changing the untrusted prefix cannot reset its quota.
      const exhausted=await call('203.0.113.200, 198.51.100.1');
      assert.equal(exhausted.status,429);assert.ok(Number(exhausted.headers.get('retry-after'))>0);
      // Same TCP peer, different trusted client: independent quota only behind the trusted proxy.
      assert.equal((await call('198.51.100.2')).status,trustProxy?200:429,`trustProxy=${trustProxy}`);
    } finally {await fixture.close();}
  }
});

test('CloudFront ALB HTTP preserves client quotas across edges and ignores forged forwarding prefixes', async () => {
  const fixture=await databaseFixture(undefined,false,undefined,false,undefined,{trustProxy:true,proxyMode:'cloudfront-alb'});
  try {
    let now=0;
    const limiter=new LocationLimit(()=>now);
    fixture.app.get(LocationLimit).take=actor=>limiter.take(actor);
    fixture.app.get(GeoapifyProvider).lookup=async()=>({items:[],attribution:'Test provider'});
    const call=async(viewer:string,edge:string,prefix:string)=>{
      now+=1500;
      // CloudFront appends the viewer and ALB appends the edge. Earlier values are untrusted.
      return fetch(fixture.base+'/locations/autocomplete',{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-For':`${prefix}, ${viewer}, ${edge}`,'X-Forwarded-Proto':'http,https','Forwarded':'for=192.0.2.200;proto=http','X-Real-IP':'192.0.2.200'},body:JSON.stringify({text:'Hanoi',locale:'vi'})});
    };
    for(let i=0;i<30;i++)assert.equal((await call('198.51.100.1',`192.0.2.${i+1}`,`203.0.113.${i+1}`)).status,200);
    assert.equal((await call('198.51.100.1','192.0.2.99','203.0.113.201, 203.0.113.202')).status,429);
    assert.equal((await call('198.51.100.2','192.0.2.99','203.0.113.201')).status,200);
    assert.equal((await call('2001:db8::1','192.0.2.99','203.0.113.201')).status,200);
  }finally{await fixture.close();}
});

test('CloudFront ALB HTTP uses the HTTPS viewer contract instead of internal or forged protocol headers', async () => {
  for(const proxyMode of [undefined,'alb','cloudfront-alb'] as const){
    // This diagnostic route does not query DB. Attach it before Nest initializes routes.
    const app=await createApp({databaseUrl:'postgresql://localhost/dvqb_test',cursorSecret:'c'.repeat(48),port:0,host:'127.0.0.1',trustProxy:proxyMode!==undefined,proxyMode},undefined,captureLogs().log);
    const server=app.getHttpAdapter().getInstance();
    server.get('/proxy-observation',(req:{ip?:string;protocol:string;secure:boolean},res:{json:(value:unknown)=>void})=>res.json({ip:req.ip,protocol:req.protocol,secure:req.secure}));
    try{
      await app.listen(0,'127.0.0.1');
      for(const suppliedProto of ['http','https','http, https','invalid']){
        const response=await fetch(await app.getUrl()+'/proxy-observation',{headers:{'X-Forwarded-For':'203.0.113.99, 198.51.100.2, 192.0.2.99','X-Forwarded-Proto':suppliedProto}});
        const observed=await response.json();
        if(proxyMode==='cloudfront-alb')assert.deepEqual(observed,{ip:'198.51.100.2',protocol:'https',secure:true});
        else if(proxyMode==='alb')assert.equal(observed.ip,'192.0.2.99');
        else {assert.ok(['127.0.0.1','::ffff:127.0.0.1'].includes(observed.ip));assert.equal(observed.protocol,'http');assert.equal(observed.secure,false);}
      }
    }finally{await app.close();}
  }
});
