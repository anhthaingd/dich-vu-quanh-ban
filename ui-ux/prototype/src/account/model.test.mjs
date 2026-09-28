import test from 'node:test';
import assert from 'node:assert/strict';
import {seedAccount,accountAction as act,seedAddresses,addressAction} from './model.mjs';
test('OTP wrong/expired cannot log in; resend and correct OTP can',()=>{
 let a=act(seedAccount(false),'challenge',{kind:'phoneLogin',value:'0901234567'}).account;
 assert.ok(act(a,'verify',{code:'000000'}).error);a=act(a,'expire').account;assert.ok(act(a,'verify',{code:'123456'}).error);
 a=act(a,'resend').account;assert.ok(act(a,'verify',{code:'123456'}).account.logged);
});
test('channel changes require both verifications and preserve old value until then',()=>{
 let a=act(seedAccount(true),'challenge',{kind:'changePhone',value:'0901111222'}).account;
 a=act(a,'verify',{code:'123456'}).account;assert.equal(a.phone,'0901234567');
 assert.ok(act(a,'verify',{code:'0'}).error);
 a=act(a,'verify',{code:'123456'}).account;assert.equal(a.phone,'0901111222');assert.equal(a.sessions.length,1);
 assert.ok(act(a,'challenge',{kind:'changePhone',value:'0900000099'}).error);
});
test('email registration requires verification and leaves phone unverified',()=>{
 let a=act(seedAccount(false),'challenge',{kind:'register',value:'new@example.com',name:'Mai',password:'New12345'}).account;
 assert.equal(a.logged,false);a=act(a,'verify',{code:'123456'}).account;
 assert.equal(a.email,'new@example.com');assert.equal(a.phoneVerified,false);assert.equal(a.logged,true);
});
test('password reset requires correct OTP; old password stops working',()=>{
 let a=act(seedAccount(true),'challenge',{kind:'reset',value:'khach@example.com'}).account;
 a=act(a,'verify',{code:'123456',password:'New12345'}).account;
 assert.equal(a.logged,false);assert.ok(act(a,'emailLogin',{email:a.email,password:'Demo12345'}).error);
 assert.equal(act(a,'emailLogin',{email:a.email,password:'New12345'}).account.logged,true);
});
test('recovery and deletion requests do not grant access or remove account',()=>{
 let a=act(seedAccount(false),'recovery',{contact:'new@example.com',evidence:'Sample job'}).account;assert.equal(a.logged,false);
 assert.ok(act(a,'deleteRequest',{code:'123456',consent:false}).error);
 a=act(a,'deleteRequest',{code:'123456',consent:true,blockers:['Open job']}).account;
 assert.equal(a.deletion.status,'Chờ admin xem xét');assert.equal(a.name,'Anh Tuấn');assert.equal(a.deletion.blockers.length,1);
});
test('saved address defaults are unique; edits and deletion preserve job snapshots',()=>{
 let list=seedAddresses();const job={address:list[0].detail};
 list=addressAction(list,'save',{id:2,label:'Office',detail:'Address 2',area:'Ba Đình',default:true});
 assert.equal(list.filter(a=>a.default).length,1);assert.equal(list.find(a=>a.default).id,2);
 list=addressAction(list,'delete',{id:2});assert.equal(list[0].default,true);
 list=addressAction(list,'save',{...list[0],detail:'New'});assert.notEqual(job.address,list[0].detail);
 assert.throws(()=>addressAction(list,'save',{id:3,label:' ',detail:' ',default:false}));
});
test('new phone registration requires name and OTP before creating sample identity',()=>{
 const a=seedAccount(false);assert.ok(act(a,'challenge',{kind:'phoneLogin',value:'0902222333'}).error);
 let b=act(a,'challenge',{kind:'phoneLogin',value:'0902222333',name:'Mai'}).account;
 assert.equal(b.phone,a.phone);b=act(b,'verify',{code:'123456'}).account;
 assert.equal(b.phone,'0902222333');assert.equal(b.name,'Mai');assert.equal(b.emailVerified,false);
});
