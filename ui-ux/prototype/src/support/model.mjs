export const reportStates={open:'Mới gửi',reviewing:'Đang xem xét',awaiting:'Chờ bổ sung',resolved:'Đã giải quyết',closed:'Đã đóng'};
export function reportAction(reports,event,data,identity,admin=false){
 const fail=error=>({reports,error});
 if(!identity)return fail('Cần đăng nhập để gửi hỗ trợ.');
 if(event==='create'){
  if(!data.subject?.trim()||!data.text?.trim())return fail('Nhập tiêu đề và mô tả vấn đề.');
  const item={id:'HT-'+String(reports.length+1).padStart(3,'0'),owner:identity,sender:data.sender||identity,jobId:data.jobId||null,subject:data.subject.trim(),status:'open',messages:[{by:'user',text:data.text.trim(),files:data.files||[],at:new Date().toISOString()}]};
  return {reports:[...reports,item],id:item.id};
 }
 const item=reports.find(r=>r.id===data.id);
 if(!item||(!admin&&item.owner!==identity))return fail('Không có quyền truy cập báo cáo này.');
 if(!data.text?.trim())return fail('Nhập nội dung gửi.');
 if(item.status==='closed')return fail('Báo cáo đã đóng. Tạo báo cáo mới nếu cần hỗ trợ tiếp.');
 if(admin&&(!Object.keys(reportStates).includes(data.status)||data.code!=='654321'))return fail('Chọn trạng thái và nhập mã quản trị mẫu 654321.');
 const next={...item,status:admin?data.status:item.status==='awaiting'?'reviewing':item.status,messages:[...item.messages,{by:admin?'admin':'user',text:data.text.trim(),files:admin?[]:data.files||[],at:new Date().toISOString()}]};
 return {reports:reports.map(r=>r===item?next:r),id:item.id};
}
export function moderateReview(job,key,action,data,admin){
 if(!admin||data.code!=='654321'||!data.reason?.trim())return {error:'Cần quyền admin, lý do và mã mẫu 654321.'};
 if(!['review','partnerReview'].includes(key)||!job?.[key]||!['hide','restore','keep'].includes(action))return {error:'Không tìm thấy đánh giá hoặc thao tác không hợp lệ.'};
 return {job:{...job,[key]:{...job[key],hidden:action==='keep'?job[key].hidden:action==='hide',moderation:{action,reason:data.reason.trim()},reportResolved:true}}};
}
export function verifyProfile(draft,kind,status,data,admin){
 if(!admin||data.code!=='654321'||!data.reason?.trim())return {error:'Cần quyền admin, lý do và mã mẫu 654321.'};
 if(draft.verification[kind]?.status!=='Chờ xét duyệt'||!['Cần bổ sung','Không đạt','Đã xác minh'].includes(status))return {error:'Hồ sơ không còn chờ duyệt.'};
 if(status==='Đã xác minh'&&!data.checked)return {error:'Cần xác nhận đã đối chiếu chứng cứ.'};
 return {draft:{...draft,verification:{...draft.verification,[kind]:{...draft.verification[kind],status,reason:data.reason.trim()}}}};
}
export function reviewStats(jobs,partnerId){const related=jobs.filter(j=>j.partner.id===partnerId&&j.review);if(!related.length)return null;const visible=related.map(j=>j.review).filter(r=>!r.hidden);return {rating:visible.length?(visible.reduce((n,r)=>n+r.stars,0)/visible.length).toFixed(1).replace('.',','):null,reviews:visible.length,reviewScope:'trong lượt thử'};}
