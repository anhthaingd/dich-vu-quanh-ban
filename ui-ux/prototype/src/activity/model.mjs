import {complete} from '../journey-model.mjs';
export const terminal=j=>['cancelled','withdrawn','declined'].includes(j.status);
export function activityTransition(j,event,v,side='customer',now=Date.now()){
 const record=(next,text)=>({...next,activity:[...(j.activity||[]),{text,side,time:now}]});
 if(event==='schedule'&&j.status==='accepted'&&!j.stopped&&!j.invoice?.locked&&v.agreed&&Date.parse(`${v.date}T${v.time}:00+07:00`)>now)
 return record({...j,timing:'Hẹn trước',date:v.date,time:v.time,scheduleVersion:(j.scheduleVersion||0)+1},`Đổi lịch: ${v.date} ${v.time} (Hà Nội)`);
 if(event==='cancel'&&v.reason?.trim()&&!j.invoice?.locked&&!terminal(j)){
  if(j.status==='pending')return record({...j,status:side==='customer'?'withdrawn':'declined',cancelReason:v.reason},`${side==='customer'?'Rút':'Từ chối'} yêu cầu: ${v.reason}`);
  if(j.status==='accepted'&&v.agreed&&!j.stopped){if(v.cost)return record({...j,stopped:true,draft:null,invoice:j.invoice?{...j.invoice,revision:true,used:0,reason:'Dừng việc: lập lại chi phí thực tế'}:undefined},`Dừng, chờ hóa đơn chi phí thực tế: ${v.reason}`);return record({...j,status:'cancelled',invoice:undefined,draft:null,cancelReason:v.reason},`Đã hủy sau trao đổi: ${v.reason}`);}
 }
 if(event==='evaluate'&&complete(j)&&Number.isInteger(v.stars)&&v.stars>=1&&v.stars<=5){const key=side==='customer'?'review':'partnerReview';if(!j[key])return {...j,[key]:{...v,hidden:false}};}
 if(event==='replyReview'&&complete(j)&&v.text?.trim()){const key=side==='customer'?'partnerReview':'review';if(j[key]&&!j[key].reply)return {...j,[key]:{...j[key],reply:v.text.trim()}};}
 if(event==='requestReview'&&complete(j)&&v.text?.trim()){const key=side==='customer'?'partnerReview':'review';if(j[key]&&!j[key].report)return {...j,[key]:{...j[key],report:v.text.trim()}};}
 return j;
}
export function canCall(jobs,id,members=[]){return jobs.some(j=>j.status==='accepted'&&!j.stopped&&(j.partner.id===id||(j.partner.id===2&&j.assignedId===id&&members.some(m=>m.id===id&&m.active!==false))));}
export const defaultSettings=()=>({messages:true,calls:true,work:true,reminders:true});
