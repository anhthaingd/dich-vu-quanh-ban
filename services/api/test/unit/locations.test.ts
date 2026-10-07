import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { locationInput } from '../../src/modules/locations/locations.input.js';
import { GeoapifyProvider } from '../../src/integrations/maps/geoapify.js';
import { LocationLimit } from '../../src/modules/locations/locations.limit.js';
const point = { latitude: 21, longitude: 105 };
test('location inputs reject unknown fields, missing/invalid points and oversized text', () => {
  assert.deepEqual(locationInput('reverse', { point, locale: 'vi' }), { point, locale: 'vi' });
  for (const body of [{ text:'ab', locale:'vi' },{ text:'a'.repeat(301),locale:'vi' },{ text:'Hanoi', locale:'fr' },{ text:'Hanoi',locale:'vi',url:'https://evil.test' }]) assert.throws(()=>locationInput('autocomplete',body));
  for (const latitude of [NaN,91,'21',null]) assert.throws(()=>locationInput('reverse',{point:{latitude,longitude:105},locale:'vi'}));
  assert.deepEqual(locationInput('geocode',{text:'  Hanoi  ',locale:'en',bias:{latitude:0,longitude:0}}),{text:'Hanoi',locale:'en',bias:{latitude:0,longitude:0}});
});
test('provider normalizes results, limits output, preserves reverse pin and does not pass private input',async()=>{
  let sent: URL|undefined;
  const provider=new GeoapifyProvider('test-key',async (url)=>{sent=new URL(String(url));return new Response(JSON.stringify({results:[{place_id:'abc',formatted:'Hà Nội',lat:22,lon:106,result_type:'street'}]}));});
  const r=await provider.lookup('reverse',{point,locale:'vi'});
  assert.ok('address' in r);assert.deepEqual(r.address?.point,point);assert.equal(r.address?.precision,'approximate');
  assert.equal(sent?.hostname,'api.geoapify.com');assert.equal(sent?.searchParams.get('lat'),'21');
  const list=await provider.lookup('autocomplete',{text:'Ha Noi',locale:'vi',bias:point});
  assert.ok('items' in list);assert.equal(list.items[0].text,'Hà Nội');assert.equal(sent?.searchParams.get('filter'),'countrycode:vn');
});
test('provider distinguishes missing config, throttling, empty response and malformed data without leaking payload',async()=>{
  await assert.rejects(new GeoapifyProvider().lookup('geocode',{text:'Hanoi',locale:'vi'}),e=> e instanceof Error && e.message==='Service Unavailable');
  const fake=(status:number,body:unknown)=>new GeoapifyProvider('private-key',async()=>new Response(JSON.stringify(body),{status}));
  await assert.rejects(fake(429,{secret:'never-log'}).lookup('geocode',{text:'Hanoi',locale:'vi'}),e=> e instanceof Error && !e.message.includes('never-log'));
  const r=await fake(200,{results:[]}).lookup('reverse',{point,locale:'vi'});assert.ok('address' in r);assert.equal(r.address,null);
  await assert.rejects(fake(200,{results:[{formatted:'bad',lat:999,lon:0}]}).lookup('geocode',{text:'Hanoi',locale:'vi'}));
});
test('limiter caps burst, identities and daily calls and expires counters',()=>{
  let now=0;const l=new LocationLimit(()=>now,3);
  l.take('a');l.take('a');l.take('a');assert.ok(l.take('b')>0);
  now=86400001;assert.equal(l.take('b'),0);
  const burst=new LocationLimit(()=>now);for(let i=0;i<4;i++)assert.equal(burst.take('a'),0);assert.ok(burst.take('a')>0);
  now+=1001;assert.equal(burst.take('a'),0);
});
test('normalized provider results match the canonical location OpenAPI schemas',async()=>{
  const { Ajv2020 } = await import('ajv/dist/2020.js');
  const { default: formats } = await import('ajv-formats');
  const spec=JSON.parse(await readFile(new URL('../../../../docs/technical-design/openapi.json',import.meta.url),'utf8'));
  const ajv=new Ajv2020({strict:false});(formats as unknown as (instance:typeof ajv)=>void)(ajv);
  const provider=new GeoapifyProvider('test',async()=>new Response(JSON.stringify({results:[{place_id:'1',formatted:'Public fixture',lat:21,lon:105,result_type:'building'}]})));
  for(const action of ['autocomplete','geocode','reverse'] as const){
    const schema=action==='reverse'?'LocationReverse':'LocationSuggestions';
    const validate=ajv.compile({...spec.components.schemas[schema],components:spec.components});
    assert.ok(validate(await provider.lookup(action,action==='reverse'?{point,locale:'vi'}:{text:'Hanoi',locale:'vi'})),JSON.stringify(validate.errors));
  }
});
