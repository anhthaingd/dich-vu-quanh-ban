import {test} from 'node:test';
import assert from 'node:assert/strict';
import {totals,transition,complete} from './journey-model.mjs';
const invoiced=()=>transition(transition({status:'pending'},'accept'),'invoice');
test('300k invoice with 80k points: cash 220k, fee 20k, reward 2933',()=>{
 const j=transition(invoiced(),'points',80000);
 assert.deepEqual(totals(j.invoice),{total:300000,cash:220000,fee:20000,reward:2933});
});
test('all points and zero value produce no cash or reward',()=>{
 assert.deepEqual(totals({labor:200000,materials:100000,used:300000}),{total:300000,cash:0,fee:20000,reward:0});
 assert.deepEqual(totals({labor:0,materials:0,used:0}),{total:0,cash:0,fee:0,reward:0});
});
test('invoice lock alone and either payment confirmation alone cannot enable review',()=>{
 let j=transition(invoiced(),'lock');
 assert.equal(complete(j),false);
 assert.equal(transition(j,'review',{stars:5}),j);
 for(const event of ['paid','received']) {const one=transition(j,event);assert.equal(complete(one),false);assert.equal(transition(one,'review',{stars:5}),one);}
});
test('both payment orders work; repeated receipt and review are idempotent',()=>{
 for(const events of [['paid','received'],['received','paid']]) {
 let j=transition(invoiced(),'lock');for(const e of events)j=transition(j,e);
 assert.equal(complete(j),true);assert.equal(transition(j,'received'),j);
 j=transition(j,'review',{stars:5,text:'Tốt'});assert.equal(transition(j,'review',{stars:1}),j);
 }
});
test('revision requires reason, resets unheld points, blocks confirmation until replacement',()=>{
 let j=transition(invoiced(),'points',50000);
 assert.equal(transition(j,'revise',' '),j);
 j=transition(j,'revise','Sai tiền vật tư');assert.equal(j.invoice.used,0);assert.equal(transition(j,'lock'),j);
 j=transition(j,'invoice');assert.equal(j.invoice.version,2);assert.equal(j.invoice.revision,false);
});
test('locked invoices reject revision, point changes and replacement',()=>{
 const j=transition(invoiced(),'lock');for(const [e,v]of[['revise','Sai'],['points',80000],['invoice',null]])assert.equal(transition(j,e,v),j);
});
test('invalid point values do not change invoice',()=>{
 const j=invoiced();for(const n of [-1,0.5,NaN,Infinity,300001])assert.equal(transition(j,'points',n),j);
});
test('unaccepted and declined work cannot generate invoice or receive money',()=>{
 const j={status:'pending'};assert.equal(transition(j,'invoice'),j);assert.equal(transition(j,'received'),j);
 const d=transition(j,'decline');assert.equal(transition(d,'accept'),d);assert.equal(transition(d,'invoice'),d);
});
