import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hireIssue,customerRoom} from './flow-guards.mjs';
import {seedCatalog} from './admin/model.mjs';
import {actors} from './partner-model.mjs';
test('submission rechecks live partner and skill instead of the open form snapshot',()=>{
 const catalog=seedCatalog(),p={id:1,skills:['Sửa điện dân dụng']};
 assert.equal(hireIssue(p,{},catalog,'Sửa điện dân dụng'),'');
 assert.ok(hireIssue({...p,suspended:true},{},catalog,'Sửa điện dân dụng'));
 assert.ok(hireIssue(p,{1:false},catalog,'Sửa điện dân dụng'));
 assert.ok(hireIssue({...p,skills:[]},{},catalog,'Sửa điện dân dụng'));
 assert.ok(hireIssue(undefined,{},catalog));
 catalog[0].active=false;assert.ok(hireIssue(p,{},catalog,'Sửa điện dân dụng'));
});
test('job chat goes to worker-customer pair and reuses key across assignments',()=>{
 assert.equal(customerRoom(actors.company),'p2:main');assert.equal(customerRoom(actors.dung),'p101:main');
 assert.equal(customerRoom(actors.solo),'p1:main');assert.equal(customerRoom({...actors.dung,employeeId:110}),'p110:main');
});
test('work notifications reach current worker and business once, including new members',async()=>{
 const {partnerTargets}=await import('./flow-guards.mjs');
 assert.deepEqual(partnerTargets({partner:{id:2},assignedId:101},actors),['company','dung']);
 assert.deepEqual(partnerTargets({partner:{id:2},assignedId:110},actors),['company','member-110']);
 assert.deepEqual(partnerTargets({partner:{id:2},assignedId:100},actors),['company']);
 assert.deepEqual(partnerTargets({partner:{id:1}},actors),['solo']);
});
