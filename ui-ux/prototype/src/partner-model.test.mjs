import {test} from 'node:test';
import assert from 'node:assert/strict';
import {actors,canView,canWork,partnerTransition as act,wallet} from './partner-model.mjs';
import {transition} from './journey-model.mjs';
const company=()=>({id:'C1',partner:{id:2},status:'pending'});
const draft={labor:200000,materials:100000,photo:'sample',note:'Hoàn tất'};
const assigned=()=>act(act(company(),'accept',null,actors.company),'assign',101,actors.company);
test('employee cannot see unassigned work, accept or assign',()=>{
 const j=company();assert.equal(canView(j,actors.dung),false);assert.equal(act(j,'accept',null,actors.dung),j);assert.equal(act(j,'assign',101,actors.dung),j);
});
test('manager can assign directly, employee can invoice without manager approval',()=>{
 const j=assigned();assert.equal(canWork(j,actors.dung),true);assert.equal(canWork(j,actors.company),false);
 assert.equal(act(j,'sendInvoice',draft,actors.company),j);assert.equal(act(j,'sendInvoice',draft,actors.dung).invoice.labor,200000);
});
test('assignment transfer revokes former employee and keeps audit',()=>{
 const first=assigned(),second=act(first,'assign',102,actors.company);
 assert.equal(canView(second,actors.dung),false);assert.equal(canWork(second,actors.ha),true);assert.equal(second.assignments.length,2);assert.equal(act(second,'sendInvoice',draft,actors.dung),second);
});
test('invoice requires proof and both valid amounts; zero amounts remain valid',()=>{
 const j=assigned();for(const value of [{...draft,photo:null},{...draft,labor:''},{...draft,materials:-1},{...draft,labor:0.5}])assert.equal(act(j,'sendInvoice',value,actors.dung),j);
 assert.ok(act(j,'sendInvoice',{...draft,labor:0,materials:0},actors.dung).invoice);
});
test('only current worker receives money, once, on locked invoice',()=>{
 let j=act(assigned(),'sendInvoice',draft,actors.dung);assert.equal(act(j,'received',null,actors.dung),j);
 j=transition(j,'lock');assert.equal(act(j,'received',null,actors.company),j);j=act(j,'received',null,actors.dung);assert.equal(j.invoice.received,true);assert.equal(act(j,'received',null,actors.dung),j);assert.equal(act(j,'assign',102,actors.company),j);
});
test('wallet separates fee holds, withdrawal holds, settlement and providers',()=>{
 let j=transition(transition(act(assigned(),'sendInvoice',draft,actors.dung),'points',80000),'lock');
 const req=[{partnerId:2,type:'withdraw',amount:100000,status:'pending'}];
 assert.deepEqual(wallet([j],req,2),{balance:500000,feeHold:20000,withdrawalHold:100000,withdrawable:380000,feeAvailable:480000});
 j=act(j,'received',null,actors.dung);assert.deepEqual(wallet([j],req,2),{balance:560000,feeHold:0,withdrawalHold:100000,withdrawable:460000,feeAvailable:560000});assert.equal(wallet([j],req,1).balance,500000);
});
test('100k debt allowance cannot be withdrawn',()=>{
 const j={partner:{id:1},invoice:{labor:5500000,materials:0,used:0,received:true,locked:true}};
 const w=wallet([j],[],1);assert.equal(w.balance,-50000);assert.equal(w.withdrawable,0);assert.equal(w.feeAvailable,50000);
});
test('manager can assign self; solo can invoice own accepted job',()=>{
 const self=act(act(company(),'accept',null,actors.company),'assign',100,actors.company);assert.ok(act(self,'sendInvoice',draft,actors.company).invoice);
 const solo={partner:{id:1},status:'accepted'};assert.ok(act(solo,'sendInvoice',draft,actors.solo).invoice);assert.equal(act(solo,'sendInvoice',draft,actors.dung),solo);
});
