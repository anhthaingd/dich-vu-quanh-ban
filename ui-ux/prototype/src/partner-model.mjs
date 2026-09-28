import {hasGrant,jobManager} from './grants.mjs';
import {heldRequest} from './finance/model.mjs';
import {totals,transition,complete} from './journey-model.mjs';
export const staff=[{id:100,name:'Quản lý An Tâm',role:'Quản lý · có thể tự thực hiện'},{id:101,name:'Phạm Văn Dũng',role:'Nhân viên điện lạnh'},{id:102,name:'Lê Thu Hà',role:'Nhân viên điện lạnh'}];
export const actors={lan:{partnerId:3,employeeId:3,manager:true,name:'Trần Thị Lan'},hai:{partnerId:4,employeeId:4,manager:true,name:'Lê Quang Hải'},gara:{partnerId:5,employeeId:5,manager:true,name:'Gara Thành Công'},solo:{partnerId:1,employeeId:1,manager:true,name:'Nguyễn Văn Minh'},company:{partnerId:2,employeeId:100,manager:true,name:'Quản lý An Tâm'},dung:{partnerId:2,employeeId:101,manager:false,name:'Phạm Văn Dũng'},ha:{partnerId:2,employeeId:102,manager:false,name:'Lê Thu Hà'}};
export const canView=(j,a)=>a.active!==false&&j.partner.id===a.partnerId&&(jobManager(a)||j.assignedId===a.employeeId);
export const canWork=(j,a)=>canView(j,a)&&j.status==='accepted'&&(j.partner.id!==2||j.assignedId===a.employeeId);
export function partnerTransition(j,event,value,a,members=staff){
 if(!canView(j,a))return j;
 if(['accept','decline'].includes(event))return hasGrant(a,'jobs.accept')?transition(j,event):j;
 if(event==='assign'&&hasGrant(a,'jobs.assign')&&j.partner.id===2&&j.status==='accepted'&&!j.invoice?.received&&!complete(j)&&members.some(p=>p.id===value&&p.active!==false)&&j.assignedId!==value)
   return {...j,assignedId:value,assignments:[...(j.assignments||[]),{from:j.assignedId||null,to:value,by:a.employeeId}],draft:null};
 if(!canWork(j,a))return j;
 if(event==='draft'&&!j.invoice?.locked)return {...j,draft:value};
 if(event==='sendInvoice'&&!j.invoice?.locked&&(!j.invoice||j.invoice.revision)){
   const labor=Number(value?.labor),materials=Number(value?.materials);
   if(!value?.photo||value.labor===''||value.materials===''||!Number.isSafeInteger(labor)||!Number.isSafeInteger(materials)||labor<0||materials<0||!Number.isSafeInteger(labor+materials))return j;
   return {...j,draft:null,invoice:{labor,materials,used:0,version:(j.invoice?.version||0)+1,locked:false,paid:false,received:false,revision:false,photo:value.photo,note:value.note||'',author:a.name}};
 }
 if(event==='received')return transition(j,event);
 return j;
}
export function wallet(jobs,requests,partnerId){
 const own=jobs.filter(j=>j.partner.id===partnerId),settled=own.filter(j=>j.invoice?.received);
 const balance=500000+requests.filter(r=>r.partnerId===partnerId&&r.status==='completed').reduce((n,r)=>n+(r.type==='topup'?r.amount:-r.amount),0)+settled.reduce((n,j)=>n+j.invoice.used-totals(j.invoice).fee,0);
 const feeHold=own.filter(j=>j.invoice?.locked&&!j.invoice.received).reduce((n,j)=>n+totals(j.invoice).fee,0);
 const withdrawalHold=requests.filter(r=>r.partnerId===partnerId&&heldRequest(r)).reduce((n,r)=>n+r.amount,0);
 return {balance,feeHold,withdrawalHold,withdrawable:Math.max(0,balance-feeHold-withdrawalHold),feeAvailable:Math.max(0,balance-feeHold-withdrawalHold+100000)};
}
