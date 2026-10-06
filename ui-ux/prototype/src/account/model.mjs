export const seedAccount=logged=>({logged,name:'Anh Tuấn',phone:'0901234567',phoneVerified:true,email:'khach@example.com',password:'Demo12345',emailVerified:true,challenge:null,tick:0,sessions:[{id:1,name:'Thiết bị đang dùng',current:true},{id:2,name:'Chrome · máy tính mẫu',current:false}],recovery:null,deletion:null});
export const validPhone=v=>/^0\d{9}$/.test(v);
export const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export function accountAction(a,event,data={}){
 const fail=error=>({account:a,error});
 if(a.deleted)return fail('Tài khoản đã được đánh dấu xóa.');
 if(a.locked&&!['recovery','verifyRecovery','logout'].includes(event))return fail('Tài khoản đang bị khóa; gửi yêu cầu hỗ trợ khôi phục.');
 if(event==='verifyRecovery'){if(a.recovery?.status!=='Chờ xác minh kênh mới'||data.code!=='123456')return fail('Chưa được duyệt hoặc mã mẫu chưa đúng.');const contact=a.recovery.contact;return {account:{...a,...(validPhone(contact)?{phone:contact,phoneVerified:true}:{email:contact,emailVerified:true}),logged:false,sessions:[],challenge:null,recovery:{...a.recovery,status:'Đã xác minh kênh mới; đăng nhập lại'}}};}
 if(event==='logout')return {account:{...a,logged:false,challenge:null}};
 if(event==='expire')return {account:{...a,tick:a.tick+6}};
 if(event==='resend')return a.challenge?{account:{...a,challenge:{...a.challenge,expires:a.tick+5}}}:fail('Chưa có yêu cầu xác minh.');
 if(event==='profile')return data.name?.trim()?{account:{...a,name:data.name.trim()}}:fail('Nhập tên hiển thị.');
 if(event==='session')return {account:{...a,sessions:a.sessions.filter(s=>s.current||s.id!==data.id)}};
 if(event==='emailLogin'){
  if(data.email!==a.email||data.password!==a.password)return fail('Email hoặc mật khẩu chưa đúng trong tài khoản mẫu.');
  if(!a.emailVerified)return fail('Cần xác minh email trước.');
  return {account:{...a,logged:true}};
 }
 if(event==='password'){
  if(data.old!==a.password)return fail('Mật khẩu hiện tại chưa đúng.');
  if(data.next.length<8)return fail('Bản mẫu yêu cầu mật khẩu ít nhất 8 ký tự.');
  return {account:{...a,password:data.next,sessions:a.sessions.filter(s=>s.current)}};
 }
 if(event==='challenge'){
  const {kind,value,password,name}=data;
  if(['phoneLogin','verifyPhone','changePhone'].includes(kind)&&!validPhone(value))return fail('Nhập số điện thoại 10 chữ số bắt đầu bằng 0.');
  if(['register','reset','changeEmail'].includes(kind)&&!validEmail(value))return fail('Nhập email hợp lệ.');
  if(kind==='phoneLogin'&&value!==a.phone&&!name?.trim())return fail('Nhập tên để tạo tài khoản điện thoại mẫu mới.');
  if(kind==='reset'&&value!==a.email)return fail('Dùng email của tài khoản mẫu '+a.email+'.');
  if(kind==='register'&&(!name?.trim()||password?.length<8))return fail('Nhập tên và mật khẩu mẫu ít nhất 8 ký tự.');
  if((kind==='changePhone'&&value==='0900000099')||(kind==='changeEmail'&&value==='trung@example.com'))return fail('Kênh này đã thuộc tài khoản khác. Đăng nhập hoặc yêu cầu hỗ trợ; không tự gộp tài khoản.');
  return {account:{...a,challenge:{kind,value,password,name,newPhone:kind==='phoneLogin'&&value!==a.phone,stage:kind.startsWith('change')?'current':'target',expires:a.tick+5}}};
 }
 if(event==='verify'){
  const c=a.challenge;if(!c)return fail('Không có yêu cầu xác minh.');
  if(a.tick>=c.expires)return fail('Mã đã hết hạn. Hãy gửi lại mã.');
  if(data.code!=='123456')return fail('Mã chưa đúng. Mã thử là 123456.');
  if(c.stage==='current')return {account:{...a,challenge:{...c,stage:'target',expires:a.tick+5}}};
  let next={...a,challenge:null};
  if(c.kind==='register')next={...next,name:c.name.trim(),email:c.value,password:c.password,emailVerified:true,phoneVerified:false,logged:true};
  if(c.kind==='phoneLogin')next={...next,logged:true,phoneVerified:true,...(c.newPhone?{phone:c.value,name:c.name.trim(),email:'',emailVerified:false,password:''}:{})};
  if(c.kind==='verifyPhone'||c.kind==='changePhone')next={...next,phone:c.value,phoneVerified:true};
  if(c.kind==='changeEmail')next={...next,email:c.value,emailVerified:true};
  if(c.kind.startsWith('change'))next.sessions=next.sessions.filter(s=>s.current);
  if(c.kind==='reset'){
   if(!data.password||data.password.length<8)return fail('Nhập mật khẩu mới ít nhất 8 ký tự.');
   next={...next,password:data.password,logged:false,sessions:[]};
  }
  return {account:next};
 }
 if(event==='recovery'){
  if(!data.contact?.trim()||!data.evidence?.trim())return fail('Nhập kênh liên hệ và thông tin chứng minh tài khoản.');
  return {account:{...a,recovery:{...data,status:'Chờ admin xem xét'}}};
 }
 if(event==='deleteRequest'){
  if(data.code!=='123456'||!data.consent)return fail('Xác nhận mất point và nhập mã xác thực mẫu.');
  return {account:{...a,deletion:{status:'Chờ admin xem xét',blockers:data.blockers||[]}}};
 }
 return fail('Thao tác không hợp lệ.');
}
export const seedAddresses=()=>[{id:1,label:'Nhà riêng',detail:'12 Trần Thái Tông, Cầu Giấy, Hà Nội',area:'Cầu Giấy',default:true}];
export function addressAction(list,event,data){
 if(event==='delete')return list.filter(a=>a.id!==data.id);
 if(event==='default')return list.map(a=>({...a,default:a.id===data.id}));
 if(event==='save'){
  if(!data.label.trim()||!data.detail.trim())throw Error('Nhập tên gợi nhớ và địa chỉ chi tiết.');
  const value={...data,label:data.label.trim(),detail:data.detail.trim(),default:data.default||list.length===0};
  const next=list.some(a=>a.id===value.id)?list.map(a=>a.id===value.id?value:a):[...list,value];
  return value.default?next.map(a=>({...a,default:a.id===value.id})):next;
 }
 return list;
}
