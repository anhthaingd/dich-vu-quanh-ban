import {test} from 'node:test';
import assert from 'node:assert/strict';
import {id,size,email,requireOperationalTarget,scenarios} from '../data/operational-model.mjs';
test('operational seed identities are stable and collision-free across entity types',()=>{
 const ids=new Set();for(const type of ['user','partner','job'])for(let i=0;i<size[type+'s'];i++){const value=id(type+':'+i);assert.match(value,/^[0-9a-f-]{36}$/);assert.equal(id(type+':'+i),value);assert.ok(!ids.has(value));ids.add(value);}
 assert.equal(new Set(Array.from({length:size.users},(_,i)=>email(i))).size,size.users);assert.equal(new Set(scenarios).size,scenarios.length);
});
test('operational seed refuses test, production, remote and connection override targets',()=>{
 const base={NODE_ENV:'development',DATABASE_URL:'postgresql://127.0.0.1:55432/dvqb_local'};assert.equal(requireOperationalTarget(base).pathname,'/dvqb_local');
 for(const extra of [{NODE_ENV:'production'},{NODE_ENV:'test'},{DATABASE_URL:'postgresql://remote/dvqb_local'},{DATABASE_URL:'postgresql://localhost/dvqb_test'},{DATABASE_URL:base.DATABASE_URL+'?options=-csearch_path=other'},{DATABASE_URL:'https://localhost/dvqb_local'}])assert.throws(()=>requireOperationalTarget({...base,...extra}));
});
