import {useState} from 'react';
import {View} from 'react-native';
import {Button} from '../../../components/ui/Button';
import {AdminDesk} from './AdminDesk';
import {RecoveryPanel} from './RecoveryPanel';
import {AdminFinance} from '../../finance/screens/AdminFinance';
import {BackofficePanel} from '../../backoffice/BackofficePanel';
import {officeText,type OfficeLocale,type OfficeMode} from '../../backoffice/messages';
import type {AdminApi} from '../api/admin-api';
import type {Translate} from './presentation';
export function P2Desk({client,grants,t,locale,fail,lock,owner}:{client:AdminApi;grants:string[];t:Translate;locale:OfficeLocale;fail:(e:unknown)=>void;lock:()=>void;owner:string}){
 const standard=grants.some(p=>['accounts.manage','catalog.manage','support.read','moderation.manage','audit.read'].includes(p));
 const sections=[...(standard?['standard']:[]),...(grants.includes('finance.read')?['finance','invoices']:[]),...(grants.includes('reports.read')?['metrics','jobs']:[]),...(grants.includes('accounts.manage')?['recovery','deletion']:[]),...(grants.includes('grant.manage')?['grants']:[])];
 const [tab,setTab]=useState(sections[0]);
 return <View style={{gap:16}}><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{sections.map(s=><Button key={s} testID={'p2-admin-'+s} label={officeText(locale,s)} variant={tab===s?'primary':'secondary'} onPress={()=>setTab(s)}/>)}</View>{tab!=='standard'&&<Button label={officeText(locale,'lock')} variant="secondary" onPress={lock}/>}{tab==='standard'?<AdminDesk client={client} grants={grants} t={t} locale={locale} fail={fail} lock={lock}/>:tab==='finance'?<AdminFinance client={client} locale={locale} grants={grants} fail={fail}/>:tab==='recovery'||tab==='deletion'?<RecoveryPanel key={tab} client={client} domain={tab==='recovery'?'recovery-reports':'account-deletions'} fail={fail}/>:tab?<BackofficePanel key={tab} client={client} mode={tab as OfficeMode} locale={locale} grants={grants} owner={owner} fail={fail}/>:null}</View>;
}
