// Capture actual installed native app against the persistent dvqb_local API.
// No DB reset, API replacement, route injection or product instrumentation.
import {readFile,writeFile,mkdir,chmod,readdir,copyFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {homedir} from 'node:os';
import {createHmac} from 'node:crypto';
import {id} from '../data/operational-model.mjs';
const [platform,phase='account']=process.argv.slice(2);if(!['ios','android'].includes(platform))throw Error('ios|android phase');
const device=platform==='ios'?'9B485B08-15C4-40BB-9E29-03816068E6AC':'emulator-5554';
const credentials=JSON.parse(await readFile('.local/seed-operational/credentials.json','utf8'));
const manifest=JSON.parse(await readFile('.local/seed-operational/manifest.json','utf8'));
const directory=resolve('.local/ux-01-recapture/runs',platform,phase+'-'+Date.now());await mkdir(directory,{recursive:true,mode:0o700});await chmod(directory,0o700);
const imageDir=resolve('.local/ux-01-recapture/candidates');await mkdir(imageDir,{recursive:true,mode:0o700});
const commands=[],shots=[];
const push=(k,v)=>commands.push(v===undefined?k:{[k]:v});
const tap=(value,optional=false)=>{push('waitForAnimationToEnd',{timeout:1500});push('tapOn',{id:value,enabled:true,...(optional?{optional}: {})});};
const text=(value,optional=false)=>push('tapOn',{text:value,enabled:true,...(optional?{optional}: {})});
const scrollText=(value,direction='DOWN')=>push('scrollUntilVisible',{element:{text:value},direction,centerElement:platform!=='ios',speed:60,visibilityPercentage:90,timeout:40000});
const wait=value=>push('extendedWaitUntil',{visible:{id:value},timeout:30000});
const scroll=(value,direction='DOWN')=>{push('scrollUntilVisible',{element:{id:value},direction,centerElement:platform!=='ios',visibilityPercentage:value==='auth-logout'?20:100,speed:60,timeout:40000});push('waitForAnimationToEnd',{timeout:1000});};
const shot=(key)=>{if(['login','register'].includes(key))wait('auth-email');if(['account','owner-account','employee-account'].includes(key))wait('account-points');if(key==='customer-invoice-draft'){push('extendedWaitUntil',{visible:{text:'Hóa đơn sẽ xuất hiện ở đây'},timeout:30000});push('extendedWaitUntil',{notVisible:{text:'Đang tải.*'},timeout:30000});}if(key.includes('-invoice-')&&key!=='customer-invoice-draft'){wait('invoice-review|invoice-editor');push('extendedWaitUntil',{notVisible:{text:'Đang tải.*'},timeout:30000});}if(!key.includes('-job-')&&!key.includes('-invoice-')){push('extendedWaitUntil',{notVisible:{text:'Đang tải.*'},timeout:30000});push('waitForAnimationToEnd',{timeout:1500});}push('takeScreenshot',platform+'-'+key);shots.push(key);};
const back=()=>{scroll('nav-back','UP');tap('nav-back');};
const open=(path)=>{push('openLink',{link:'dvqb://'+path,autoVerify:true});push('waitForAnimationToEnd',{timeout:500});if(/^jobs\/[^/]+$/.test(path))wait('job-state');else if(path.endsWith('/invoice'))push('extendedWaitUntil',{notVisible:{text:'Đang tải.*'},timeout:30000});};
function login(index){scroll('auth-email','UP');tap('auth-email');push('inputText',credentials.accounts[index].email);push('pressKey','Enter');scroll('auth-password');tap('auth-password');push('inputText','${SEED_PASSWORD}');if(platform==='android'){push('hideKeyboard');tap('auth-submit');}else{push('pressKey','Enter');text('Not Now',true);}if(index<240)wait('account-points');else if(index<247)wait('admin-password');else if(index===249)wait('support-create');}
function accountMenu(target,key){back();tap('nav-account');wait('account-points');scroll(target);tap(target);const check={'profile':'profile-name','sessions':'sessions-revoke-others','addresses':'address-add','verify-contact':'verify-contact','notification-settings':'notices-save','organizations':'team-token','support':'support-create'}[key];if(check)wait(check);shot(key);back();}
function start(){push('stopApp');push('openLink',{link:'exp+dich-vu-quanh-ban://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8085',autoVerify:true});if(platform==='ios'){text('Continue',true);text('Close',true);}wait('nav-account');}
function logout(){tap('nav-account',true);scroll('auth-logout');tap('auth-logout');wait('auth-email');}
const officeSections=['standard','finance','invoices','metrics','jobs','recovery','deletion','grants'];let officeCurrent=phase.startsWith('admin-details')?'deletion':'standard';
function officeTab(target){
 scroll('p2-admin-'+officeCurrent,'UP');
 while(officeCurrent!==target){const step=Math.sign(officeSections.indexOf(target)-officeSections.indexOf(officeCurrent)),next=officeSections[officeSections.indexOf(officeCurrent)+step];push('runFlow',{when:{notVisible:{id:'p2-admin-'+next}},commands:[{swipe:{from:{id:'p2-admin-'+officeCurrent},direction:step>0?'LEFT':'RIGHT',duration:500}}]});tap('p2-admin-'+next);officeCurrent=next;}
 tap('p2-admin-'+target);
}
function financeDetail(){
 officeTab('finance');scrollText('Tìm theo mã / partner');push('tapOn',{text:'Tìm theo mã / partner',index:1});push('inputText',id('topup:0:pending'));push('hideKeyboard');scrollText('^Tải lại$');text('^Tải lại$');scroll('finance-admin-item-'+id('topup:0:pending'));tap('finance-admin-item-'+id('topup:0:pending'));scrollText(id('topup:0:pending'));shot('admin-finance-detail');
}

for(const stepPhase of phase.split(',')){const phase=stepPhase;
if(phase==='guest-more'){logout();scroll('otp-open');tap('otp-open');shot('security-anonymous');back();scroll('recovery-open');tap('recovery-open');shot('recovery');back();login(144);}else if(phase==='public-profile'){open('partners/'+id('partner:1'));push('extendedWaitUntil',{visible:{text:'.*Trần Minh Anh.*'},timeout:30000});shot('public-profile');open('partners/'+id('partner:1')+'/hire');wait('job-skill-.*');shot('job-create');}else if(/^login-[0-9]+$/.test(phase)){logout();login(Number(phase.slice(6)));}else if(phase==='reset-account'){back();tap('nav-account');wait('account-points');}else if(phase==='logout'){start();logout();}else if(phase==='boot'){start();}else if(phase==='account'){
 start();shot('home');tap('nav-account');shot('login');scroll('auth-toggle');tap('auth-toggle');shot('register');scroll('auth-toggle');tap('auth-toggle');login(180);shot('account');
 for(const [target,key] of [['profile-open','profile'],['sessions-open','sessions'],['addresses-open','addresses'],['verify-open','verify-contact'],['notification-settings-open','notification-settings'],['team-open','organizations'],['support-open','support'],['security-open','security']])accountMenu(target,key);
 scroll('jobs-open');tap('jobs-open');wait('jobs-view-calendar');shot('customer-jobs');tap('jobs-view-calendar');shot('calendar');tap('nav-messages');shot('conversations');tap('nav-notifications');shot('notifications');
}else if(['account-ios-login','account-loginonly'].includes(phase)){
 if(phase==='account-loginonly')tap('nav-account');
 if(phase==='account-ios-login'){scroll('auth-toggle');tap('auth-toggle');}login(180);shot('account');
 for(const [target,key] of [['profile-open','profile'],['sessions-open','sessions'],['addresses-open','addresses'],['verify-open','verify-contact'],['notification-settings-open','notification-settings'],['team-open','organizations'],['support-open','support'],['security-open','security']])accountMenu(target,key);
 scroll('role-customer','UP');scroll('jobs-open');tap('jobs-open');wait('jobs-view-calendar');shot('customer-jobs');tap('jobs-view-calendar');shot('calendar');tap('nav-messages');shot('conversations');tap('nav-notifications');shot('notifications');
}else if(phase==='account-address-tail'){
 tap('addresses-open');wait('address-add');shot('addresses');back();
 for(const [target,key] of [['verify-open','verify-contact'],['notification-settings-open','notification-settings'],['team-open','organizations'],['support-open','support'],['security-open','security']])accountMenu(target,key);
 back();tap('nav-jobs');wait('jobs-view-calendar');shot('customer-jobs');tap('jobs-view-calendar');shot('calendar');tap('nav-messages');shot('conversations');tap('nav-notifications');shot('notifications');
}else if(phase==='account-notices-current'){
 wait('notices-save');shot('notification-settings');back();
 for(const [target,key] of [['team-open','organizations'],['support-open','support'],['security-open','security']])accountMenu(target,key);back();tap('nav-jobs');wait('jobs-view-calendar');shot('customer-jobs');tap('jobs-view-calendar');shot('calendar');tap('nav-messages');shot('conversations');tap('nav-notifications');shot('notifications');
}else if(phase==='account-tail'){
 for(const [target,key] of [['notification-settings-open','notification-settings'],['team-open','organizations'],['support-open','support'],['security-open','security']])accountMenu(target,key);back();tap('nav-jobs');wait('jobs-view-calendar');shot('customer-jobs');tap('jobs-view-calendar');shot('calendar');tap('nav-messages');shot('conversations');tap('nav-notifications');shot('notifications');
}else if(phase==='account-remaining'){
 tap('nav-account');for(const [target,key] of [['sessions-open','sessions'],['addresses-open','addresses'],['verify-open','verify-contact'],['notification-settings-open','notification-settings'],['team-open','organizations'],['support-open','support'],['security-open','security']])accountMenu(target,key);
 scroll('role-customer','UP');scroll('jobs-open');tap('jobs-open');wait('jobs-view-calendar');shot('customer-jobs');tap('jobs-view-calendar');shot('calendar');tap('nav-messages');shot('conversations');tap('nav-notifications');shot('notifications');
}else if(phase==='account-resume'){
 scroll('role-customer','UP');scroll('security-open');tap('security-open');shot('security');back();scroll('role-customer','UP');scroll('jobs-open');tap('jobs-open');wait('jobs-view-calendar');shot('customer-jobs');tap('jobs-view-calendar');shot('calendar');tap('nav-messages');shot('conversations');tap('nav-notifications');shot('notifications');
}else if(['customer','customer-more','customer-primary','customer-fix','customer-after-draft','customer-more-current'].includes(phase)){
 if(phase==='customer-more'||phase==='customer-primary'){start();logout();login(phase==='customer-primary'?180:144);}if(phase==='customer-fix'){text('Đăng xuất');wait('nav-account');tap('nav-account');login(144);}
 const all=manifest.cases.filter(c=>c.customer===credentials.accounts[['customer-more','customer-fix','customer-more-current'].includes(phase)?144:180].email);
 for(const scenario of (phase==='customer-after-draft'?['draft','sent','revision_requested','locked','stopped','rescheduled','assigned']:phase==='customer-fix'?['completed','payment_reported','admin_completed']:['requested','accepted','draft','sent','revision_requested','locked','payment_reported','completed','admin_completed','assigned','declined','withdrawn','stopped','rescheduled'])){const c=all.find(c=>c.scenario===scenario);if(!c)continue;open('jobs/'+c.job);shot('customer-job-'+scenario);if(c.invoice){open('jobs/'+c.job+'/invoice');shot('customer-invoice-'+scenario);}if(scenario==='completed'){open('jobs/'+c.job+'/reviews');shot('customer-reviews');}}
 open('partners/'+id('partner:1'));push('extendedWaitUntil',{visible:{text:'.*Trần Minh Anh.*'},timeout:30000});shot('public-profile');open('partners/'+id('partner:1')+'/hire');wait('job-skill-.*');shot('job-create');
}else if(phase==='account-current'){
 tap('nav-account');shot('account');accountMenu('team-open','organizations');
}else if(phase==='customer-invoices'){
 logout();login(180);for(const c of manifest.cases.filter(c=>c.customer===credentials.accounts[180].email&&c.invoice)){open('jobs/'+c.job+'/invoice');shot('customer-invoice-'+c.scenario);}tap('nav-jobs');wait('jobs-view-calendar');tap('jobs-view-calendar');shot('calendar');
}else if(['owner','owner-resume','owner-editor'].includes(phase)){
 // Start from a signed-in ordinary account with the persistent header visible.
 if(phase!=='owner-editor'){if(phase==='owner'){start();logout();login(0);}else{tap('nav-account',true);}shot('owner-account');scroll('partners-open');tap('partners-open');shot('partners');scroll('partner-create-open');tap('partner-create-open');shot('partner-create');back();}else{text('Thử lại',true);push('extendedWaitUntil',{visible:{text:'Thợ Nguyễn Minh Anh · Hà Nội'},timeout:30000});shot('partners');}
 text('Thợ Nguyễn Minh Anh · Hà Nội');shot('partner-editor');
 let previous='profile';scroll('partner-section-profile');for(const section of ['profile','skills','areas','locations','gallery']){push('runFlow',{when:{notVisible:{id:'partner-section-'+section}},commands:[{swipe:{from:{id:'partner-section-'+previous},direction:'LEFT',duration:500}}]});tap('partner-section-'+section);shot('partner-'+section);previous=section;}
 scroll('partner-verification');tap('partner-verification');shot('verification');back();back();scroll('wallet-open-'+id('partner:0'));tap('wallet-open-'+id('partner:0'));wait('finance-bank');shot('wallet');
 for(const [button,key] of [['finance-topup','topup'],['finance-payout','payout'],['finance-bank','bank'],['finance-history','finance-history']]){scroll(button);tap(button);shot(key);back();}
}else if(phase==='owner-jobs'){
 for(const scenario of ['requested','accepted','draft','sent','revision_requested','locked','payment_reported','completed','admin_completed','declined','withdrawn','stopped','rescheduled','assigned']){const c=manifest.cases.find(c=>c.owner===credentials.accounts[0].email&&c.scenario===scenario);open('jobs/'+c.job);shot('owner-job-'+scenario);if(c.invoice){open('jobs/'+c.job+'/invoice');shot('owner-invoice-'+scenario);}if(scenario==='completed'){open('jobs/'+c.job+'/reviews');shot('owner-reviews');}}
 open('conversations/'+id('conversation:144:0'));shot('conversation');
}else if(phase==='support-resume'){
 tap('support-create');wait('support-subject');shot('support-create');tap('support-list');tap('support-filter-all');scroll('support-open-.*');push('tapOn',{id:'support-open-.*',index:0,enabled:true});wait('support-state');shot('support-detail');
}else if(phase==='extras-resume'){
 tap('address-add');wait('address-label');shot('address-form');back();for(let i=0;i<2;i++)push('swipe',{direction:'DOWN',duration:400});scroll('support-open');tap('support-open');wait('support-create');tap('support-create');wait('support-subject');shot('support-create');tap('support-list');scroll('support-open-.*');push('tapOn',{id:'support-open-.*',index:0,enabled:true});wait('support-state');shot('support-detail');
}else if(phase==='extras'){
 tap('nav-account');scroll('role-customer','UP');scroll('addresses-open');tap('addresses-open');wait('address-add');tap('address-add');wait('address-label');shot('address-form');back();
 scroll('role-customer','UP');scroll('support-open');tap('support-open');wait('support-create');tap('support-create');wait('support-subject');shot('support-create');tap('support-list');scroll('support-open-.*');tap('support-open-.*');wait('support-state');shot('support-detail');
}else if(phase==='discover'){
 start();tap('nav-catalog');tap('search-service-open');wait('service-all');shot('service-picker');tap('service-all');tap('search-filters-open');wait('search-filters-apply');shot('search-filters');tap('search-filters-apply');tap('search-pick-location');wait('location-query');shot('location-picker');scroll('location-cancel');tap('location-cancel');
 tap('search-filters-open');scroll('search-saved-addresses');tap('search-saved-addresses');text('Nhà riêng');tap('search-filters-apply');scroll('search-submit','UP');tap('search-submit');wait('search-view-map');shot('search-results');tap('search-view-map');shot('search-map');
}else if(phase==='wallet-detail-open'){
 tap('nav-account',true);scroll('partners-open');tap('partners-open');scroll('wallet-open-'+id('partner:0'));tap('wallet-open-'+id('partner:0'));scroll('finance-history');tap('finance-history');scroll('finance-item-.*');push('tapOn',{id:'finance-item-.*',index:0,enabled:true});scrollText(id('topup:0:pending'));shot('finance-detail');
}else if(phase==='discover-results-current'){
 tap('nav-catalog');tap('search-filters-open');scroll('search-saved-addresses');tap('search-saved-addresses');text('Nhà riêng');tap('search-filters-apply');wait('search-result-.*');scroll('search-result-.*');shot('search-results');scroll('search-view-map','UP');tap('search-view-map');push('swipe',{direction:'UP',duration:700});shot('search-map');
}else if(phase==='discover-results'){
 start();tap('search-filters-open');tap('search-saved-addresses');text('Nhà riêng');tap('search-filters-apply');tap('search-submit');wait('search-result-.*');shot('search-results');tap('search-view-map');shot('search-map');
}else if(phase==='team'){
 start();logout();login(3);scroll('team-open');tap('team-open');wait('team-token');scroll('team-open-'+id('partner:3'));tap('team-open-'+id('partner:3'));wait('team-invite-open');shot('team-members');
 let previousTab='members';for(const tab of ['invites','left','permissions']){scroll('team-tab-'+previousTab,'UP');push('runFlow',{when:{notVisible:{id:'team-tab-'+tab}},commands:[{swipe:{from:{id:'team-tab-'+previousTab},direction:'LEFT',duration:500}}]});tap('team-tab-'+tab);shot('team-'+tab);previousTab=tab;}
 scroll('team-grants-'+id('employee:3'));tap('team-grants-'+id('employee:3'));scroll('grant-jobs.accept','UP');shot('team-grants');scrollText('Hủy');text('Hủy');scroll('team-tab-invites','UP');tap('team-tab-invites');scroll('team-invite-open','UP');tap('team-invite-open');wait('team-invite-contact');shot('team-invite');scrollText('Hủy');text('Hủy');scroll('team-tab-members','UP');tap('team-tab-members');scroll('team-remove-'+id('employee:3'));tap('team-remove-'+id('employee:3'));scroll('team-remove-reason');shot('team-remove');
}else if(phase==='team-tail'){
 scrollText('Hủy');text('Hủy');scroll('team-tab-invites','UP');tap('team-tab-invites');scroll('team-invite-open','UP');tap('team-invite-open');wait('team-invite-contact');shot('team-invite');scrollText('Hủy');text('Hủy');scroll('team-tab-members','UP');tap('team-tab-members');scroll('team-remove-'+id('employee:3'));tap('team-remove-'+id('employee:3'));scroll('team-remove-reason');shot('team-remove');
}else if(phase==='team-remove'){
 scroll('team-tab-members','UP');tap('team-tab-members');scroll('team-remove-'+id('employee:3'));tap('team-remove-'+id('employee:3'));scroll('team-remove-reason');shot('team-remove');
}else if(phase==='employee'){
 start();logout();login(75);shot('employee-account');scroll('team-open');tap('team-open');wait('team-token');shot('employee-organizations');scroll('team-leave-'+id('employee:3'));tap('team-leave-'+id('employee:3'));scroll('team-leave-reason');shot('team-leave');
 const c=manifest.cases.find(c=>c.worker===credentials.accounts[75].email&&c.scenario==='assigned');open('jobs/'+c.job);shot('employee-job');
}else if(phase==='employee-tail'){
 tap('nav-account');scroll('team-open');tap('team-open');wait('team-token');scroll('team-leave-'+id('employee:3'));tap('team-leave-'+id('employee:3'));scroll('team-leave-reason');shot('team-leave');const c=manifest.cases.find(c=>c.worker===credentials.accounts[75].email&&c.scenario==='assigned');open('jobs/'+c.job);shot('employee-job');
}else if(phase==='admin-login'){
 start();logout();login(240);shot('admin-mfa');
}else if(phase==='admin-lock'){
 scroll('admin-lock','UP');tap('admin-lock');wait('admin-password');
}else if(phase==='admin-auth'){
 tap('admin-password');push('inputText','${SEED_PASSWORD}');push('pressKey','Enter');tap('admin-code');push('inputText','${SEED_TOTP}');if(platform==='android')push('hideKeyboard');else push('swipe',{direction:'UP',duration:400});scroll('admin-verify');tap('admin-verify');wait('p2-admin-standard');
}else if(['admin-standard','admin-standard-tail','admin-standard-rest'].includes(phase)){
 officeTab('standard');let previousDomain='users';
 for(const domain of (phase!=='admin-standard'?['categories','skills','reports','verifications','reviews','partners','audit']:['users','categories','skills','reports','verifications','reviews','partners','audit'])){scroll('admin-tab-'+previousDomain,'UP');push('runFlow',{when:{notVisible:{id:'admin-tab-'+domain}},commands:[{swipe:{from:{id:'admin-tab-'+previousDomain},direction:'LEFT',duration:500}}]});tap('admin-tab-'+domain);previousDomain=domain;if(domain==='audit'){scroll('audit-search');shot('admin-audit');continue;}scroll('admin-search');if(['users','partners'].includes(domain)){tap('admin-search');push('eraseText',200);push('inputText',id(domain==='users'?'user:180':'partner:3'));push('pressKey','Enter');scroll('admin-search-submit');tap('admin-search-submit');scroll('admin-item-.*');}shot('admin-'+domain);scroll('admin-item-.*');push('tapOn',{id:'admin-item-.*',index:0});scroll('admin-close-detail','UP');shot('admin-'+domain+'-detail');tap('admin-close-detail');}
}else if(phase==='admin-security'){
 scroll('mfa-security-toggle','UP');tap('mfa-security-toggle');wait('mfa-generate');shot('admin-security');tap('mfa-security-toggle');
}else if(phase==='admin-exit-current'){
 scroll('admin-logout');tap('admin-logout');wait('nav-account');tap('nav-account');login(249);shot('restricted-support');
}else if(phase==='admin-exit'){
 scroll('p2-admin-deletion','UP');tap('p2-admin-deletion');scroll('admin-logout');tap('admin-logout');wait('nav-account');tap('nav-account');login(249);shot('restricted-support');
}else if(phase==='admin-invoice-resume'){
 push('hideKeyboard');push('scrollUntilVisible',{element:{text:id('invoice:120'),index:1},direction:'DOWN',centerElement:platform!=='ios',speed:60,timeout:40000});push('tapOn',{text:id('invoice:120'),index:1});push('extendedWaitUntil',{visible:{text:'Công việc:.*'},timeout:30000});shot('admin-invoices-detail');
}else if(['admin-details','admin-details-rest'].includes(phase)){
 for(const [section,target,key] of [['invoices',id('invoice:120'),'admin-invoices-detail'],['jobs',id('job:0'),'admin-jobs-detail'],['grants',id('user:241'),'admin-grants-detail']]){
  if(phase==='admin-details-rest'&&section==='invoices')continue;officeTab(section);scrollText('Tìm theo mã hoặc tên');push('tapOn',{text:'Tìm theo mã hoặc tên',index:1});push('inputText',target);push('hideKeyboard');scrollText('^Tìm kiếm$');text('^Tìm kiếm$');const label=section==='grants'?credentials.accounts[241].name:target;push('scrollUntilVisible',{element:{text:label,...(section==='grants'?{}:{index:1})},direction:'DOWN',centerElement:platform!=='ios',speed:60,timeout:40000});if(section==='grants')shot('admin-grants');push('tapOn',{text:label,...(section==='grants'?{}:{index:1})});push('extendedWaitUntil',{visible:{text:section==='grants'?'.*support.read':section==='jobs'?'Khách hàng:.*':'Công việc:.*'},timeout:30000});shot(key);
 }
 for(const [section,resource,user] of [['recovery',id('recovery:0'),id('user:230')],['deletion',id('deletion'),id('user:250')]]){officeTab(section);scrollText(resource+'.*');text(resource+'.*');push('extendedWaitUntil',{visible:{text:user},timeout:30000});shot('admin-'+section+'-detail');}
 financeDetail();
}else if(phase==='admin-finance-open'){
 financeDetail();
}else if(phase==='admin-finance-resume'){
 push('scrollUntilVisible',{element:{text:'.*Chờ duyệt.*'+id('topup:0:pending')},direction:'DOWN',centerElement:platform!=='ios',speed:60,timeout:40000});push('tapOn',{text:'.*Chờ duyệt.*'+id('topup:0:pending')});scrollText('Chi tiết.*');shot('admin-finance-detail');
}else if(phase==='finance-detail-current'){
 scrollText(id('topup:0:pending'));shot('finance-detail');
}else if(phase==='owner-security-call'){
 tap('nav-account');scroll('security-open');tap('security-open');tap('security-mode-identity');shot('security-identity');push('runFlow',{when:{notVisible:{id:'security-mode-delete'}},commands:[{swipe:{from:{id:'security-mode-identity'},direction:'LEFT',duration:500}}]});tap('security-mode-delete');scrollText('Kiểm tra nghĩa vụ');text('Kiểm tra nghĩa vụ');push('extendedWaitUntil',{visible:{text:'Point còn lại:.*'},timeout:30000});shot('security-delete');back();
 open('conversations/'+id('conversation:144:0'));wait('chat-body');shot('conversation');
 const c=manifest.cases.find(c=>c.owner===credentials.accounts[0].email&&c.scenario==='accepted');open('jobs/'+c.job);scroll('call-target-customer');tap('call-target-customer');wait('call-retry');shot('call');push('pressKey','Back');
}else if(phase==='owner-tail-current'){
 tap('nav-account');scroll('partners-open');tap('partners-open');text('Thợ Nguyễn Minh Anh · Hà Nội');scroll('partner-verification');tap('partner-verification');wait('verification-refresh');tap('verification-refresh');wait('verification-state');shot('verification');
 tap('nav-account');scroll('partners-open');tap('partners-open');scroll('wallet-open-'+id('partner:0'));tap('wallet-open-'+id('partner:0'));scroll('finance-history');tap('finance-history');scroll('finance-item-.*');push('tapOn',{id:'finance-item-.*',index:0,enabled:true});scrollText(id('topup:0:pending'));shot('finance-detail');
 tap('nav-account');scroll('security-open');tap('security-open');tap('security-mode-identity');shot('security-identity');push('runFlow',{when:{notVisible:{id:'security-mode-delete'}},commands:[{swipe:{from:{id:'security-mode-identity'},direction:'LEFT',duration:500}}]});tap('security-mode-delete');scrollText('Kiểm tra nghĩa vụ');text('Kiểm tra nghĩa vụ');push('extendedWaitUntil',{visible:{text:'Point còn lại:.*'},timeout:30000});shot('security-delete');back();
 open('conversations/'+id('conversation:144:0'));wait('chat-body');shot('conversation');
 const c=manifest.cases.find(c=>c.owner===credentials.accounts[0].email&&c.scenario==='accepted');open('jobs/'+c.job);scroll('call-target-customer');tap('call-target-customer');wait('call-retry');shot('call');push('pressKey','Back');
}else if(phase==='owner-extras'){
 start();logout();login(0);for(const scenario of ['draft','payment_reported']){const c=manifest.cases.find(c=>c.owner===credentials.accounts[0].email&&c.scenario===scenario);open('jobs/'+c.job+'/invoice');shot('owner-invoice-'+scenario);}tap('nav-account');scroll('partners-open');tap('partners-open');scroll('wallet-open-'+id('partner:0'));tap('wallet-open-'+id('partner:0'));scroll('finance-history');tap('finance-history');text('^Nạp tiền$');scroll('finance-item-.*');push('tapOn',{id:'finance-item-.*',index:0,enabled:true});scrollText(id('topup:0:pending'));shot('finance-detail');tap('nav-account');scroll('security-open');tap('security-open');text('Đổi hoặc liên kết liên hệ');shot('security-identity');text('Yêu cầu xóa tài khoản');scrollText('Kiểm tra nghĩa vụ');text('Kiểm tra nghĩa vụ');push('extendedWaitUntil',{visible:{text:'Point còn lại:.*'},timeout:30000});shot('security-delete');back();
}else if(phase==='admin-office'){
 for(const section of ['finance','invoices','metrics','jobs','recovery','deletion']){officeTab(section);push('swipe',{direction:'UP',duration:500});shot('admin-'+section);}
}else if(phase==='calendar'){
 tap('nav-account');scroll('jobs-open');tap('jobs-open');wait('jobs-view-calendar');tap('jobs-view-calendar');shot('calendar');
}else if(phase==='guest'){
 logout();scroll('otp-open');tap('otp-open');shot('security-anonymous');back();scroll('recovery-open');tap('recovery-open');shot('recovery');
}else if(/^restricted-exit-[0-9]+$/.test(phase)){
 scrollText('Đăng xuất','UP');text('Đăng xuất');wait('nav-account');tap('nav-account');login(Number(phase.slice(16)));
}else if(phase==='restricted'){
 logout();login(249);shot('restricted-support');
}else throw Error('Unknown phase');
}
const flow=directory+'/flow.yaml';
function otp(){let bits=0,value=0,bytes=[];for(const c of credentials.adminSecrets[240]){value=(value<<5)|'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c);bits+=5;if(bits>=8){bytes.push((value>>>(bits-8))&255);bits-=8;}}const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)+1));const h=createHmac('sha1',Buffer.from(bytes)).update(counter).digest(),o=h[19]&15;return String((h.readUInt32BE(o)&0x7fffffff)%1000000).padStart(6,'0');}
await writeFile(flow,'appId: vn.dichvuquanhban.app\n---\n'+JSON.stringify(commands,null,2).replaceAll('${SEED_PASSWORD}',credentials.password).replaceAll('${SEED_TOTP}',otp()),{mode:0o600});
const started=new Date().toISOString();const executable=homedir()+'/.local/bin/maestro';const output=await import('node:fs');const stream=output.createWriteStream(directory+'/run.log',{mode:0o600});
const code=await new Promise((done,reject)=>{const p=spawn(executable,['--device',device,'test','--test-output-dir',directory,flow],{env:{...process.env,MAESTRO_CLI_NO_ANALYTICS:'1'},stdio:['ignore','pipe','pipe']});p.stdout.pipe(stream);p.stderr.pipe(stream);p.once('error',reject);p.once('exit',done);});stream.end();const captured=[];for(const entry of (await readdir(directory,{recursive:true})).sort()){if(entry.includes('/takeScreenshot/')&&entry.endsWith('.png')&&(await stat(resolve(directory,entry))).mtimeMs>=Date.parse(started)){await copyFile(resolve(directory,entry),resolve(imageDir,entry.split('/').at(-1)));captured.push(entry.split('/').at(-1));}}await writeFile(directory+'/result.json',JSON.stringify({platform,phase,device,started,finished:new Date().toISOString(),code,shots,captured,database:'dvqb_local'},null,2));console.log(JSON.stringify({platform,phase,code,captured:captured.length,planned:shots.length,log:directory+'/run.log'}));process.exitCode=code||0;
