export const grantLabels={'jobs.accept':'Nhận / từ chối yêu cầu','jobs.assign':'Phân công nhân viên','jobs.manage':'Quản lý lịch và dừng việc','profile.manage':'Sửa hồ sơ, kỹ năng, nhận việc','members.manage':'Quản lý thành viên và cấp quyền','wallet.read':'Xem ví và lịch sử','wallet.topup':'Tạo yêu cầu nạp','wallet.withdraw':'Tạo yêu cầu rút','bank.manage':'Quản lý ngân hàng'};
export const hasGrant=(actor,key)=>!!actor&&actor.active!==false&&(actor.grants?actor.grants.includes(key):!!actor.manager);
export const jobManager=a=>['jobs.accept','jobs.assign','jobs.manage'].some(k=>hasGrant(a,k));
export function changeGrants(team,actor,data){
 const fail=error=>({team,error}),target=team.members.find(m=>m.id===data.id);
 if(actor?.partnerId!==2||!hasGrant(actor,'members.manage')||!target?.active||target.id===100||target.id===actor.employeeId)return fail('Không được sửa quyền của chính mình, chủ doanh nghiệp hoặc thành viên không hoạt động.');
 if(!Array.isArray(data.grants)||data.grants.some(k=>!Object.hasOwn(grantLabels,k)))return fail('Nhóm quyền không hợp lệ.');
 const before=target.grants||[];
 if([...new Set([...before,...data.grants])].some(k=>before.includes(k)!==data.grants.includes(k)&&!hasGrant(actor,k)))return fail('Chỉ được thay đổi các quyền trong phạm vi mình được cấp.');
 if(data.grants.some(k=>['wallet.topup','wallet.withdraw','bank.manage'].includes(k))&&!data.grants.includes('wallet.read'))return fail('Cần cấp quyền xem ví trước khi cấp thao tác tài chính.');
 if(data.code!=='123456'||!data.reason?.trim())return fail('Nhập lý do và mã xác thực mẫu 123456.');
 return {team:{...team,members:team.members.map(m=>m.id===data.id?{...m,grants:[...new Set(data.grants)]}:m),audit:[`${actor.name} đổi quyền ${target.name}: ${data.grants.map(k=>grantLabels[k]).join(', ')||'Chỉ thực hiện việc được giao'} · ${data.reason.trim()}`,...team.audit]}};
}
