import {industries,normalize} from '../skill-catalog.mjs';
import {complete,totals} from '../journey-model.mjs';
import {terminal} from '../activity/model.mjs';
export const seedCatalog=()=>structuredClone(industries);
export const flatCatalog=c=>c.flatMap(i=>[{...i,kind:'industry',parent:''},...i.groups.flatMap(g=>[{...g,kind:'group',parent:i.id},...g.skills.map(s=>({...s,kind:'skill',parent:g.id}))])]);
export const activeCatalog=c=>c.filter(i=>i.active!==false).map(i=>({...i,groups:i.groups.filter(g=>g.active!==false).map(g=>({...g,skills:g.skills.filter(s=>s.active!==false)}))}));
export const activeSkills=c=>activeCatalog(c).flatMap(i=>i.groups.flatMap(g=>g.skills.map(s=>({...s,industry:i.name,industryId:i.id,group:g.name}))));
export function catalogAction(c,event,data){
 const fail=error=>({catalog:c,error}),nodes=flatCatalog(c),target=nodes.find(n=>n.id===data.id);
 if(data.code!=='654321'||!data.reason?.trim())return fail('Nhập lý do và mã quản trị mẫu 654321.');
 if(event==='save'&&(!data.name?.trim()||nodes.some(n=>n.id!==data.id&&n.kind===data.kind&&n.parent===(data.parent||'')&&normalize(n.name)===normalize(data.name))))return fail('Tên trống hoặc trùng trong cùng nhóm.');
 if(!['industry','group','skill'].includes(data.kind)||!['save','toggle'].includes(event))return fail('Loại thao tác không hợp lệ.');
 if(event==='toggle'&&!target)return fail('Không tìm thấy danh mục.');
 if(!target&&data.kind!=='industry'&&!nodes.some(n=>n.id===data.parent&&n.kind===(data.kind==='group'?'industry':'group')))return fail('Chọn nhóm cha hợp lệ.');
 const next=structuredClone(c),id=target?.id||'CAT-'+(nodes.length+1),value=target?null:{id,name:data.name.trim(),active:true,...(data.kind==='industry'?{groups:[]}:data.kind==='group'?{skills:[]}:{})};
 const visit=list=>{for(const n of list){if(n.id===data.id){if(event==='toggle')n.active=n.active===false;else n.name=data.name.trim();}if(n.id===data.parent&&value){(data.kind==='group'?n.groups:n.skills).push(value);}if(n.groups)visit(n.groups);if(n.skills)visit(n.skills);}};visit(next);if(!target&&data.kind==='industry')next.push(value);
 return {catalog:next,rename:target&&event==='save'&&target.kind==='skill'?{from:target.name,to:data.name.trim()}:null};
}
export const seedDirectory=()=>[{id:'customer-main',name:'Anh Tuấn',contact:'khach@example.com',role:'Khách',locked:false},...[['worker-1','Nguyễn Văn Minh','Thợ tự do'],['worker-100','Quản lý An Tâm','Quản lý'],['worker-101','Phạm Văn Dũng','Nhân viên'],['worker-102','Lê Thu Hà','Nhân viên'],['worker-3','Trần Thị Lan','Partner'],['worker-4','Lê Quang Hải','Partner'],['worker-5','Gara Thành Công','Partner']].map(([id,name,role])=>({id,name,role,contact:id+'@example.com',locked:false})),...Array.from({length:13},(_,i)=>({id:'sample-'+i,name:'Tài khoản minh họa '+(i+1),role:'Khách mẫu',contact:'mau'+(i+1)+'@example.com',locked:false}))];
export function accountDecision(a,action,data,blockers=[]){
 const fail=error=>({account:a,error});
 if(data.code!=='654321'||!data.reason?.trim())return fail('Nhập lý do và mã quản trị mẫu 654321.');
 if(a.deleted)return fail('Tài khoản đã được đánh dấu xóa trong bản thử.');
 if(action==='lock'||action==='unlock')return {account:{...a,locked:action==='lock',lockReason:data.reason,...(action==='lock'?{logged:false,sessions:[]}:{} )}};
 if(action.startsWith('recovery-')){if(!a.recovery)return fail('Người dùng chưa gửi yêu cầu khôi phục.');if(a.recovery.status.startsWith('Đã xác minh'))return fail('Yêu cầu này đã xác minh xong.');const states={'recovery-supplement':'Cần bổ sung','recovery-reject':'Đã từ chối','recovery-approve':'Chờ xác minh kênh mới'};if(!states[action])return fail('Thao tác không hợp lệ.');if(action==='recovery-approve'&&(!data.checked||!/^0\d{9}$|^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.recovery.contact)))return fail('Cần đối chiếu chứng cứ và kênh liên hệ hợp lệ.');return {account:{...a,recovery:{...a.recovery,status:states[action],reason:data.reason}}};}
 if(action.startsWith('delete-')){if(!a.deletion)return fail('Người dùng chưa gửi yêu cầu xóa.');if(action==='delete-approve'&&(blockers.length||!data.checked))return fail('Còn nghĩa vụ cần xử lý hoặc chưa đối chiếu.');if(!['delete-approve','delete-reject'].includes(action))return fail('Thao tác không hợp lệ.');return {account:{...a,deletion:{...a.deletion,status:action==='delete-approve'?'Đã duyệt xóa (mẫu)':'Đã từ chối',reason:data.reason},...(action==='delete-approve'?{deleted:true,logged:false,sessions:[],challenge:null}:{})}};}
 return fail('Thao tác không hợp lệ.');
}
export function partnerDecision(current,action,data){if(data.code!=='654321'||!data.reason?.trim()||!['warn','suspend','restore'].includes(action))return {error:'Chọn thao tác, nhập lý do và mã mẫu 654321.'};return {value:{...current,status:action==='suspend'?'suspended':action==='restore'?'active':current?.status||'active',reason:data.reason,warning:action==='warn'?data.reason:current?.warning}};}
export function metrics(jobs,requests,reports){const done=jobs.filter(complete),settled=jobs.filter(j=>j.invoice?.received);return {jobs:jobs.length,done:done.length,open:jobs.filter(j=>!complete(j)&&!terminal(j)).length,fee:settled.reduce((n,j)=>n+totals(j.invoice).fee,0),points:settled.reduce((n,j)=>n+j.invoice.used,0),reports:reports.filter(r=>r.status!=='closed').length,pendingMoney:requests.filter(r=>['pending','processing'].includes(r.status)).length};}
