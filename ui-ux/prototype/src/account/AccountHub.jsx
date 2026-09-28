import React from 'react';
import {Button} from '../App';
import {UserRound,MapPin,ShieldCheck,Briefcase,ArrowRight,Coins} from 'lucide-react';
import {Auth} from './Auth';
import {Security} from './Security';
import {Addresses} from './Addresses';
import {Onboarding} from './Onboarding';
import './account.css';
export function AccountHub({page,onGo,account,onAction,onDone,addresses,onAddresses,onSearch,onboarding,onOnboarding,onPublish,balance,blockers}){
 if(page==='auth'||page==='phoneVerify')return <Auth key={page} account={account} onAction={onAction} onDone={onDone} onRecovery={()=>onGo('recovery')} verifyPhone={page==='phoneVerify'}/>;
 if(page==='recovery')return <Security account={account} onAction={onAction} initialPage="recovery" blockers={blockers}/>;
 if(!account.logged)return <section className="ds-panel"><h1>Đăng nhập để tiếp tục.</h1><p>Quản lý thông tin, địa chỉ và hồ sơ dịch vụ của bạn.</p><Button onClick={()=>onGo('auth')}>Đăng nhập / đăng ký</Button></section>;
 if(page==='security')return <Security account={account} onAction={onAction} blockers={blockers}/>;
 if(page==='addresses')return <Addresses addresses={addresses} onChange={onAddresses} onSearch={onSearch}/>;
 if(page==='onboarding')return <Onboarding draft={onboarding} onChange={onOnboarding} onPublish={onPublish} phoneVerified={account.phoneVerified} onVerifyPhone={()=>onGo('phoneVerify')}/>;
 return <><p className="eyebrow">GÓC CỦA BẠN</p><h1>Chào {account.name}.</h1><div className="account-overview"><aside className="account-point-card" aria-label="Point của bạn"><Coins size={26} aria-hidden="true"/><div><span>Point của bạn</span><div className="account-point-value"><strong>{balance.toLocaleString('vi-VN')} point</strong><span>≈ {balance.toLocaleString('vi-VN')}đ</span></div><p>Dùng để thanh toán dịch vụ</p></div></aside><section><div className="account-links">{[['support','Hỗ trợ và báo cáo','Theo dõi yêu cầu, bổ sung chứng cứ và xem phản hồi',ShieldCheck],['settings','Cài đặt','Tùy chọn thông báo của bạn',UserRound],['security','Thông tin và bảo mật','Kênh đăng nhập, thiết bị, khôi phục và xóa tài khoản',ShieldCheck],['addresses','Địa chỉ đã lưu','Nhà riêng, văn phòng và vị trí cần làm',MapPin],['onboarding',onboarding.published?'Hồ sơ partner và xác minh':'Trở thành partner','Giới thiệu tay nghề và đăng ký cung cấp dịch vụ',Briefcase]].map(([id,title,sub,Icon])=><button key={id} onClick={()=>onGo(id)}><Icon size={24}/><span><strong>{title}</strong><small>{sub}</small></span><ArrowRight size={18}/></button>)}</div><Button secondary onClick={()=>{onAction('logout');onGo('auth')}}>Đăng xuất tài khoản mẫu</Button></section></div></>;
}
