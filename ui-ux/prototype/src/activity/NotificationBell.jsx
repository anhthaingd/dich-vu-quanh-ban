import React from 'react';
import {Bell} from 'lucide-react';
export function NotificationBell({count=0,onClick,active=false,label=false}){return <button className={label?"notification-tab":"notification-bell"} aria-label={`Thông báo${count?`, ${count} chưa đọc`:''}`} aria-current={active?'page':undefined} onClick={onClick}><Bell size={22}/>{label&&<span>Thông báo</span>}{count>0&&<span className="notification-count">{count>99?'99+':count}</span>}</button>}
