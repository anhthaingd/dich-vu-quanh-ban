import {createHash} from 'node:crypto';
export const batch='operational-20261030-v1';
export const size={users:252,partners:72,jobs:1008};
export const cities=[{name:'Hà Nội',street:'Nguyễn Trãi',lat:21.0285,lon:105.8542},{name:'TP Hồ Chí Minh',street:'Nguyễn Văn Cừ',lat:10.7769,lon:106.7009},{name:'Đà Nẵng',street:'Nguyễn Văn Linh',lat:16.0471,lon:108.2068}];
export const adminPermissions=['support.read','support.manage','moderation.manage','audit.read','finance.review','accounts.manage','catalog.manage','finance.read','reports.read','grant.manage'];
export const permissions=['jobs.accept','jobs.assign','jobs.manage','profile.manage','members.manage','wallet.read','wallet.topup','wallet.withdraw','bank.manage','reviews.respond','reviews.write'];
export const scenarios=['requested','accepted','draft','sent','revision_requested','locked','payment_reported','completed','admin_completed','declined','withdrawn','stopped','rescheduled','assigned'];
export function id(key){const h=createHash('sha256').update(batch+':'+key).digest('hex');return h.slice(0,8)+'-'+h.slice(8,12)+'-5'+h.slice(13,16)+'-a'+h.slice(17,20)+'-'+h.slice(20,32);}
export function person(i){const surnames=['Nguyễn','Trần','Lê','Phạm','Hoàng','Đặng','Đỗ','Vũ','Bùi','Phan','Hồ','Dương'];const names=['Minh Anh','Quốc Huy','Thu Hà','Đức Long','Bảo Ngọc','Thanh Sơn','Lan Chi','Tuấn Kiệt','Ngọc Mai','Gia Bảo','Khánh Linh','Hải Nam','Phương Thảo','Hoài An','Thành Đạt','Yến Nhi','Trung Hiếu','Quỳnh Hoa','Anh Tú','Hồng Nhung','Việt Khang'];return surnames[i%surnames.length]+' '+names[Math.floor(i/surnames.length)%names.length];}
export function email(i){return `vanhanh.${String(i).padStart(3,'0')}@example.test`;}
export function accountRole(i){return i<72?'owner':i<144?'employee':i<240?'customer':i<247?'admin':i===247?'new':i===248?'unverified':i===249?'suspended':i===250?'deletion_requested':'anonymized';}
export function requireOperationalTarget(env){const u=new URL(env.DATABASE_URL??'');if(env.NODE_ENV!=='development'||!['postgres:','postgresql:'].includes(u.protocol)||!['127.0.0.1','localhost','[::1]'].includes(u.hostname)||u.pathname!=='/dvqb_local'||u.search)throw Error('Seed only accepts development /dvqb_local on loopback, without connection overrides');return u;}

export function partnerKind(p){const kind=['solo','shop','company'][Math.floor(p/3)%3];return kind==='solo'&&p%2?'company':kind;}
