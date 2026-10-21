import {useState,type ReactNode} from 'react';
import {AdminClient} from './client';
import {RecoveryPanel} from './RecoveryPanel';
import {FinancePanel} from './FinancePanel';
import {BackofficePanel} from './BackofficePanel';
import {officeText,type OfficeLocale,type OfficeMode} from './backoffice-messages';
export function P2Desk({client,locale,fail,lock,children}:{client:AdminClient;locale:OfficeLocale;fail:(e:unknown)=>void;lock:()=>void;children:ReactNode}){
 const grants=client.session!.user.admin_permissions,standard=grants.some(p=>['accounts.manage','catalog.manage','support.read','moderation.manage','audit.read'].includes(p));
 const sections=[...(standard?['standard']:[]),...(grants.includes('finance.read')?['finance','invoices']:[]),...(grants.includes('reports.read')?['metrics','jobs']:[]),...(grants.includes('accounts.manage')?['recovery','deletion']:[]),...(grants.includes('grant.manage')?['grants']:[])];const [tab,setTab]=useState(sections[0]);
 return <><nav className="admin-finance" aria-label={officeText(locale,'overview')}>{sections.map(s=><button key={s} className={tab===s?'':'secondary'} aria-pressed={tab===s} onClick={()=>setTab(s)}>{officeText(locale,s)}</button>)}</nav>{tab==='standard'?children:<main className="admin-finance"><button className="secondary" onClick={lock}>{officeText(locale,'lock')}</button>{tab==='finance'?<FinancePanel client={client} locale={locale} grants={grants} fail={fail}/>:tab==='recovery'||tab==='deletion'?<RecoveryPanel key={tab} client={client} domain={tab==='recovery'?'recovery-reports':'account-deletions'} locale={locale} fail={fail}/>:tab?<BackofficePanel key={tab} client={client} mode={tab as OfficeMode} locale={locale} grants={grants} fail={fail}/>:null}</main>}</>;
}
