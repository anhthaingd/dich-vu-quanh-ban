import {useState,type ReactNode} from 'react';
import {AdminClient} from './client';
import {RecoveryPanel} from './RecoveryPanel';
import {FinancePanel} from './FinancePanel';
import {BackofficePanel} from './BackofficePanel';
import {AdminTeam} from './AdminTeam';
import {SupportOverview} from './SupportOverview';
import type {SupportRange} from './useSupportOverview';
import {translator} from './i18n';
import {uxText} from './ux-messages';
import {officeText,type OfficeLocale,type OfficeMode} from './backoffice-messages';
export function P2Desk({client,locale,fail,lock,renderDomain}:{client:AdminClient;locale:OfficeLocale;fail:(e:unknown)=>void;lock:()=>void;renderDomain:(domain:string,range?:SupportRange,state?:string)=>ReactNode}){
 const grants=client.session!.user.admin_permissions,t=translator(locale),u=(k:string)=>uxText(locale,k);
 const primary=[...(grants.includes('support.read')?['overview','reports']:[]),...(grants.includes('grant.manage')?['grants']:[])];
 const others=[...(grants.includes('accounts.manage')?['users','recovery','deletion']:[]),...(grants.includes('catalog.manage')?['categories','skills']:[]),...(grants.includes('moderation.manage')?['verifications','reviews','partners']:[]),...(grants.includes('audit.read')?['audit']:[]),...(grants.includes('finance.read')?['finance','invoices']:[]),...(grants.includes('reports.read')?['metrics','jobs']:[])];
 const [tab,setTab]=useState(primary[0]??others[0]),label=(s:string)=>primary.includes(s)?u(s):['users','categories','skills','verifications','reviews','partners','audit'].includes(s)?t(s):officeText(locale,s);
 return <div className="ux-admin"><aside className="ux-sidebar"><p className="eyebrow">{t('title')}</p><nav aria-label={u('overview')}>{primary.map(s=><button key={s} aria-current={tab===s?'page':undefined} onClick={()=>setTab(s)}>{label(s)}</button>)}</nav><details open={!primary.includes(tab)}><summary>{u('more')}</summary><nav>{others.map(s=><button key={s} aria-current={tab===s?'page':undefined} onClick={()=>setTab(s)}>{label(s)}</button>)}</nav></details><button className="secondary" onClick={lock}>{t('lock')}</button></aside><main className="ux-content">
 {tab==='overview'||tab==='reports'?<SupportOverview queue={tab==='reports'} key={tab} client={client} locale={locale} fail={fail} renderQueue={(range,state)=>renderDomain('reports',range,state)}/>:tab==='grants'?<AdminTeam client={client} locale={locale} fail={fail}/>:tab==='finance'?<FinancePanel client={client} locale={locale} grants={grants} fail={fail}/>:tab==='recovery'||tab==='deletion'?<RecoveryPanel key={tab} client={client} domain={tab==='recovery'?'recovery-reports':'account-deletions'} locale={locale} fail={fail}/>:['metrics','jobs','invoices'].includes(tab)?<BackofficePanel key={tab} client={client} mode={tab as OfficeMode} locale={locale} grants={grants} fail={fail}/>:renderDomain(tab)}
 </main></div>;
}
