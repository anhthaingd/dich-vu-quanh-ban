import test from 'node:test';
import assert from 'node:assert/strict';
import {seedTeam,teamTransition as run,inviteStatus} from './team-model.mjs';
import {actors,canView,partnerTransition} from './partner-model.mjs';
test('invites do not grant membership; duplicate, wrong identity and expiry are rejected',()=>{
 let t=run(seedTeam(),'invite',{name:'An',phone:'0901234567'}).team;
 assert.equal(t.members.length,3);assert.ok(run(t,'invite',{name:'An',phone:'0901234567'}).error);
 assert.ok(run(t,'accept',{id:t.invites[0].id,phone:'0900000000'}).error);
 t=run(t,'advance',{}).team;assert.equal(inviteStatus(t.invites[0],t.day),'expired');
 assert.ok(run(t,'accept',{id:t.invites[0].id,phone:'0901234567'}).error);
});
test('accept once enables assignment to new employee; revocation blocks acceptance',()=>{
 let t=run(seedTeam(),'invite',{name:'An',phone:'0901234567'}).team,id=t.invites[0].id;
 assert.ok(run(run(t,'revoke',{id}).team,'accept',{id,phone:'0901234567'}).error);
 t=run(t,'accept',{id,phone:'0901234567'}).team;
 const employee=t.members.at(-1),j={partner:{id:2},status:'accepted'};
 assert.equal(partnerTransition(j,'assign',employee.id,actors.company,t.members).assignedId,employee.id);
 assert.ok(run(t,'accept',{id,phone:'0901234567'}).error);
});
test('remove clears unreceived assignments while preserving locked invoice and removes access',()=>{
 const invoice={locked:true,used:80000,labor:200000,materials:100000,paid:true,received:false};
 const jobs=[{id:'1',partner:{id:2},status:'accepted',assignedId:101,invoice,draft:{note:'old'}},{id:'2',partner:{id:1},assignedId:101}];
 assert.ok(run(seedTeam(),'remove',{id:100,reason:'x'},jobs).error);
 assert.ok(run(seedTeam(),'remove',{id:101,reason:' '},jobs).error);
 const result=run(seedTeam(),'remove',{id:101,reason:'Nghỉ việc'},jobs);
 assert.equal(result.jobs[0].invoice,invoice);assert.equal(result.jobs[0].assignedId,null);assert.equal(result.jobs[1],jobs[1]);
 assert.equal(canView(jobs[0],{...actors.dung,active:false}),false);
 assert.equal(partnerTransition(result.jobs[0],'assign',101,actors.company,result.team.members),result.jobs[0]);
});
test('reinvitation reuses identity and settled invoice is untouched',()=>{
 const j={partner:{id:2},assignedId:101,invoice:{received:true}};
 let t=run(seedTeam(),'remove',{id:101,reason:'Nghỉ'},[j]);assert.equal(t.jobs[0],j);
 t=run(t.team,'invite',{name:'Dũng',phone:'0900000002'}).team;
 t=run(t,'accept',{id:t.invites[0].id,phone:'0900000002'}).team;
 assert.equal(t.members.length,3);assert.ok(t.members.find(m=>m.id===101).active);
});
test('resend invalidates old invitation and does not allow a second pending invite',()=>{
 let t=run(seedTeam(),'invite',{name:'An',phone:'0901234567'}).team;
 const old=t.invites[0].id;t=run(t,'resend',{id:old}).team;
 assert.equal(t.invites[0].status,'replaced');assert.equal(t.invites[1].status,'pending');
 assert.ok(run(t,'accept',{id:old,phone:'0901234567'}).error);assert.ok(run(t,'resend',{id:old}).error);
 t=run(t,'accept',{id:t.invites[1].id,phone:'0901234567'}).team;
 assert.equal(t.members.length,4);assert.ok(run(t,'resend',{id:t.invites[1].id}).error);
});
test('self leave requires own active membership; invoice unchanged and assignment released',()=>{
 const t=seedTeam(),invoice={locked:true,paid:true,used:5000,received:false};
 const j={partner:{id:2},assignedId:101,status:'accepted',invoice};
 assert.ok(run(t,'leave',{id:102,reason:'x'},[j],actors.dung).error);
 assert.ok(run(t,'leave',{id:100,reason:'x'},[j],actors.company).error);
 assert.ok(run(t,'leave',{id:101,reason:'x'},[j],actors.solo).error);
 const result=run(t,'leave',{id:101,reason:'Nghỉ việc'},[j],actors.dung);
 assert.equal(result.jobs[0].invoice,invoice);assert.equal(result.jobs[0].assignedId,null);
 assert.equal(result.team.members.find(m=>m.id===101).active,false);
 assert.equal(result.jobs[0].assignments[0].by,101);
 assert.ok(run(result.team,'leave',{id:101,reason:'Lặp'},result.jobs,actors.dung).error);
});
