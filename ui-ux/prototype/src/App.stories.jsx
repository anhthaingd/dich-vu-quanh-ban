import {Journey,DesignSystem} from './Journey';
import React from'react';import{App,Button,ProviderCard,partners}from'./App';
export default{title:'Dịch vụ quanh bạn/Thử giao diện',component:App};
export const Desktop={render:()=> <Journey/>};
export const Mobile={render:()=> <Journey/>,globals:{viewport:{value:'iphone12',isRotated:false}}};
export const NoResults={render:()=> <Journey initialEmpty/>};
export const VerifiedProfile={render:()=> <div style={{maxWidth:740,padding:24}}><ProviderCard/></div>};
export const UnverifiedProfile={render:()=> <div style={{maxWidth:740,padding:24}}><ProviderCard partner={partners[3]}/></div>};
export const Buttons={render:()=> <div style={{display:'flex',gap:16,padding:32,flexWrap:'wrap'}}><Button>Nhắn tin trước</Button><Button secondary>Xem hồ sơ</Button><Button disabled>Gửi yêu cầu</Button></div>};

export const PartnerProfile={render:()=> <App initialView="profile"/>};
export const ChatBeforeHiring={render:()=> <App initialView="chat"/>};

export const DesignFoundations={name:'Design system · bộ nền tảng',render:()=> <DesignSystem/>};
export const WaitingForPartner={name:'Khách · chờ thợ nhận',render:()=> <Journey initialStage="pending"/>};
export const InvoiceReview={name:'Khách · kiểm tra hóa đơn',render:()=> <Journey initialStage="invoice"/>};
export const PaymentConfirmation={name:'Khách · xác nhận thanh toán',render:()=> <Journey initialStage="locked"/>};
export const ReviewAfterPayment={name:'Khách · đánh giá',render:()=> <Journey initialStage="completed"/>};
export const MobileInvoice={name:'Mobile · hóa đơn',render:()=> <Journey initialStage="invoice"/>,globals:{viewport:{value:'iphone12',isRotated:false}}};

export const PartnerSolo={name:'Partner · thợ tự do',render:()=> <Journey initialMode="solo"/>};
export const PartnerCompany={name:'Partner · doanh nghiệp',render:()=> <Journey initialMode="company"/>};
export const PartnerEmployee={name:'Partner · nhân viên',render:()=> <Journey initialMode="dung"/>};
export const PartnerMobile={name:'Mobile · partner',render:()=> <Journey initialMode="company"/>,globals:{viewport:{value:'iphone12',isRotated:false}}};

export const PartnerEditProfile={name:'Partner · chỉnh sửa hồ sơ',render:()=> <Journey initialMode="company" initialPartnerTab="profile"/>};
export const PartnerEditProfileMobile={name:'Mobile · chỉnh sửa hồ sơ',render:()=> <Journey initialMode="company" initialPartnerTab="profile"/>,globals:{viewport:{value:'iphone12',isRotated:false}}};

export const CompanyTeam={name:'Doanh nghiệp · đội ngũ',render:()=> <Journey initialMode="company" initialPartnerTab="team"/>};
export const CompanyTeamMobile={name:'Mobile · đội ngũ',render:()=> <Journey initialMode="company" initialPartnerTab="team"/>,globals:{viewport:{value:'iphone12',isRotated:false}}};

export const EmployeeMembership={name:'Nhân viên · tài khoản doanh nghiệp',render:()=> <Journey initialMode="dung" initialPartnerTab="membership"/>};
export const EmployeeMembershipMobile={name:'Mobile · rời doanh nghiệp',render:()=> <Journey initialMode="dung" initialPartnerTab="membership"/>,globals:{viewport:{value:'iphone12',isRotated:false}}};

export const AccountHub={name:'Tài khoản · tổng quan',render:()=> <Journey initialPage='account' initialLogged={true}/>};
export const SignIn={name:'Tài khoản · đăng nhập',render:()=> <Journey initialPage='auth' initialLogged={false}/>};
export const SecurityAccount={name:'Tài khoản · bảo mật',render:()=> <Journey initialPage='security' initialLogged={true}/>};
export const SavedAddresses={name:'Khách · địa chỉ',render:()=> <Journey initialPage='addresses' initialLogged={true}/>};
export const PartnerOnboarding={name:'Partner · đăng ký và xác minh',render:()=> <Journey initialPage='onboarding' initialLogged={true}/>};
export const RecoveryAccount={name:'Tài khoản · khôi phục',render:()=> <Journey initialPage='recovery' initialLogged={false}/>};
export const MobileAccountBatch={name:"Mobile · tài khoản và đăng ký",render:()=> <Journey initialPage="account"/>,globals:{viewport:{value:"iphone12",isRotated:false}}};

export const JobChanges={name:'Công việc · đổi lịch và dừng',render:()=> <Journey initialStage="accepted"/>};
export const BothReviews={name:'Đánh giá · hai chiều',render:()=> <Journey initialStage="completed"/>};
export const CustomerInbox={name:'Liên lạc · hộp thư khách',render:()=> <Journey initialStage="accepted" initialPage="messages"/>};
export const PartnerInbox={name:'Liên lạc · hộp thư partner',render:()=> <Journey initialMode="solo" initialStage="accepted" initialPartnerTab="chat"/>};
export const NotificationSettings={name:'Thông báo · cài đặt',render:()=> <Journey initialPage="messages" initialCommsView="settings"/>};
export const ActivityMobile={name:'Mobile · công việc và liên lạc',render:()=> <Journey initialStage="accepted"/>,globals:{viewport:{value:'iphone12',isRotated:false}}};

export const NotificationCenter={name:'Thông báo · trang riêng',render:()=> <Journey initialPage="notifications"/>};
export const CompanyAccount={name:'Doanh nghiệp · tài khoản và cài đặt',render:()=> <Journey initialMode="company" initialPartnerTab="account"/>};

export const PartnerWallet={name:'Ví · tổng quan và ngân hàng',render:()=> <Journey initialMode="solo" initialPartnerTab="wallet"/>};
export const CompanyWallet={name:'Ví · doanh nghiệp',render:()=> <Journey initialMode="company" initialPartnerTab="wallet"/>};
export const WalletMobile={name:'Mobile · ví và ngân hàng',render:()=> <Journey initialMode="company" initialPartnerTab="wallet"/>,globals:{viewport:{value:'iphone12',isRotated:false}}};

export const FirstBank={name:'Ví · ngân hàng lần đầu',render:()=> <Journey initialMode="solo" initialPartnerTab="wallet" initialBankMissing/>};
export const AdminFinanceQueue={name:'Admin · duyệt tài chính',render:()=> <Journey initialMode="admin"/>};
export const CompanyGrants={name:'Doanh nghiệp · cấp quyền',render:()=> <Journey initialMode="company" initialPartnerTab="team"/>};

export const CustomerSupport={name:'Hỗ trợ · khách gửi báo cáo',render:()=> <Journey initialStage="locked" initialPage="support"/>};
export const PartnerSupport={name:'Hỗ trợ · partner',render:()=> <Journey initialMode="solo" initialPartnerTab="support"/>};
export const AdminOperationsQueue={name:'Admin · hỗ trợ và kiểm duyệt',render:()=> <Journey initialMode="moderator" initialStage="completed" initialSupportDemo/>};

export const AdminAccounts={name:'Admin · quản lý tài khoản',render:()=> <Journey initialMode="administrator"/>};
export const AdminPartners={name:'Admin · quản lý partner',render:()=> <Journey initialMode="administrator" initialAdminSection="partners" initialStage="locked"/>};
export const AdminCatalog={name:'Admin · danh mục ngành và kỹ năng',render:()=> <Journey initialMode="administrator" initialAdminSection="catalog"/>};
export const AdminMetrics={name:'Admin · báo cáo vận hành',render:()=> <Journey initialMode="administrator" initialAdminSection="metrics" initialStage="completed"/>};
