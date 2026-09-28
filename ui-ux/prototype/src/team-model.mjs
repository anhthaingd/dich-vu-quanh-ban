import {changeGrants} from './grants.mjs';
import {staff} from './partner-model.mjs';
export const seedTeam=()=>({members:staff.map((p,i)=>({...p,active:true,phone:'090000000'+(i+1)})),invites:[],audit:[],day:0,next:103});
export const inviteStatus=(i,day)=>i.status==='pending'&&day>=i.expires?'expired':i.status;
export function teamTransition(team,event,data,jobs=[],actor){
 const fail=error=>({team,jobs,error});
 if(event==='grants')return {...changeGrants(team,actor,data),jobs};
 if(event==='leave'&&(!actor||actor.partnerId!==2||actor.employeeId!==data.id||actor.active===false||data.id===100))return fail('Bạn chỉ có thể tự rời doanh nghiệp của mình.');
 if(event==='resend'){
  const old=team.invites.find(i=>i.id===data.id);
  if(!old||!['pending','expired','revoked'].includes(inviteStatus(old,team.day)))return fail('Không thể gửi lại lời mời này.');
  if(team.members.some(m=>m.active&&m.phone===old.phone)||team.invites.some(i=>i.id!==old.id&&i.phone===old.phone&&inviteStatus(i,team.day)==='pending'))return fail('Người này đã là thành viên hoặc đang có lời mời mới.');
  const replacement={...old,id:'MOI-'+team.next,status:'pending',expires:team.day+7};
  return {team:{...team,next:team.next+1,invites:[...team.invites.map(i=>i===old?{...i,status:'replaced',replacementId:replacement.id}:i),replacement],audit:[`Gửi lại ${old.id} → ${replacement.id}`,...team.audit]},jobs};
 }
 if(event==='invite'){
  const name=data.name.trim(),phone=data.phone.trim();
  if(!name||!/^0\d{9}$/.test(phone))return fail('Nhập tên và số điện thoại 10 chữ số bắt đầu bằng 0.');
  if(team.members.some(m=>m.active&&m.phone===phone)||team.invites.some(i=>i.phone===phone&&inviteStatus(i,team.day)==='pending'))return fail('Số điện thoại đã là thành viên hoặc đang có lời mời.');
  const invite={id:'MOI-'+team.next,name,phone,status:'pending',expires:team.day+7};
  return {team:{...team,next:team.next+1,invites:[...team.invites,invite],audit:[`Mời ${name} · ${invite.id}`,...team.audit]},jobs};
 }
 if(event==='advance')return {team:{...team,day:team.day+7},jobs};
 if(event==='revoke'||event==='accept'){
  const invite=team.invites.find(i=>i.id===data.id);
  if(!invite||inviteStatus(invite,team.day)!=='pending')return fail('Lời mời không còn hiệu lực.');
  if(event==='accept'&&data.phone!==invite.phone)return fail('Cần xác minh đúng số điện thoại được mời.');
  let members=team.members,next=team.next;
  if(event==='accept'){
   if(members.some(m=>m.active&&m.phone===invite.phone))return fail('Người này đã là thành viên.');
   const old=members.find(m=>m.phone===invite.phone);
   members=old?members.map(m=>m===old?{...m,active:true,grants:[]}:m):[...members,{id:next++,name:invite.name,phone:invite.phone,role:'Nhân viên thực hiện',active:true}];
  }
  return {team:{...team,members,next,invites:team.invites.map(i=>i===invite?{...i,status:event==='accept'?'accepted':'revoked'}:i),audit:[`${event==='accept'?'Tham gia':'Thu hồi lời mời'}: ${invite.name}`,...team.audit]},jobs};
 }
 if(event==='remove'||event==='leave'){
  const member=team.members.find(m=>m.id===data.id);
  if(!member?.active||member.id===100)return fail('Không thể gỡ thành viên này.');
  if(!data.reason?.trim())return fail('Nhập lý do gỡ thành viên.');
  return {team:{...team,members:team.members.map(m=>m===member?{...m,active:false}:m),audit:[`${event==='leave'?'Tự rời':'Gỡ'} ${member.name}: ${data.reason.trim()}`,...team.audit]},jobs:jobs.map(j=>j.partner.id===2&&j.assignedId===member.id&&!j.invoice?.received?{...j,assignedId:null,draft:null,assignments:[...(j.assignments||[]),{from:member.id,to:null,by:event==='leave'?member.id:100}]}:j)};
 }
 return fail('Thao tác không hợp lệ.');
}
