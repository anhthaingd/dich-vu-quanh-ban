export const initialBank=owner=>({bank:'Vietcombank',number:'0000002468',owner:owner.toUpperCase(),status:'verified',proposal:null});
export function proposeBank(current,data,pendingWithdrawals){
 if(pendingWithdrawals)return {error:'Cần xử lý xong yêu cầu rút đang giữ tiền trước khi đổi ngân hàng.'};
 if(current.proposal)return {error:'Bạn đang có đề nghị chờ duyệt.'};
 if(!data.bank?.trim()||!/^\d{6,20}$/.test(data.number)||!data.owner?.trim()||!data.reason?.trim())return {error:'Điền ngân hàng, số tài khoản 6–20 chữ số, tên chủ tài khoản và lý do.'};
 if(data.code!=='123456')return {error:'Mã xác thực mẫu chưa đúng. Dùng 123456 để thử.'};
 return {bank:{...current,proposal:{bank:data.bank.trim(),number:data.number,owner:data.owner.trim().toUpperCase(),reason:data.reason.trim(),status:'pending'}}};
}
export function validateRequest(type,amount,available,bank){
 if(!Number.isSafeInteger(amount)||amount<=0)return 'Nhập số tiền nguyên lớn hơn 0.';
 if(type==='withdraw'&&bank.status!=='verified')return 'Ngân hàng cần được xác minh trước khi rút.';
 if(type==='withdraw'&&amount>available)return 'Số tiền vượt khoản có thể rút. Hạn mức âm không dùng để rút.';
 return '';
}
export const emptyBank=()=>({bank:'',number:'',owner:'',status:'missing',proposal:null});
export const heldRequest=r=>r.type==='withdraw'&&['pending','processing'].includes(r.status);
export function decideMoney(requests,id,action,data,admin){
 const fail=error=>({requests,error}),r=requests.find(x=>x.id===id);
 if(!admin||data.code!=='654321')return fail('Cần quyền admin và mã xác thực mẫu 654321.');
 if(!r||!data.reason?.trim())return fail('Chọn yêu cầu và nhập lý do xử lý.');
 const allowed=r.status==='pending'?(r.type==='topup'?['approve','reject']:['approve','reject']):r.status==='processing'?['paid','failed']:[];
 if(!allowed.includes(action))return fail('Yêu cầu đã được xử lý hoặc trạng thái không phù hợp.');
 if(['approve','paid'].includes(action)&&(!data.checked||!data.reference?.trim()))return fail('Xác nhận đã đối chiếu và nhập mã tham chiếu giao dịch.');
 const status=action==='approve'?(r.type==='topup'?'completed':'processing'):action==='paid'?'completed':action==='failed'?'failed':'rejected';
 return {requests:requests.map(x=>x===r?{...x,status,reason:data.reason.trim(),reference:data.reference?.trim(),audit:[...(x.audit||[]),{action,status,reason:data.reason.trim(),at:new Date().toISOString()}]}:x)};
}
export function decideBank(current,action,data,pendingWithdrawals,admin){
 const fail=error=>({bank:current,error});
 if(!admin||data.code!=='654321')return fail('Cần quyền admin và mã xác thực mẫu 654321.');
 if(!current.proposal||!['approve','reject'].includes(action)||!data.reason?.trim())return fail('Đề nghị không còn chờ duyệt hoặc thiếu lý do.');
 if(action==='approve'&&(pendingWithdrawals||!data.checked))return fail('Cần đối chiếu ngân hàng và xử lý xong các khoản rút đang giữ.');
 return {bank:action==='approve'?{...current.proposal,status:'verified',proposal:null,lastDecision:{action,reason:data.reason}}:{...current,proposal:null,lastDecision:{action,reason:data.reason,rejected:current.proposal}}};
}
