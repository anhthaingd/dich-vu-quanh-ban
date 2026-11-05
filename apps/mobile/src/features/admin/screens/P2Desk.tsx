import {Icon,type IconName} from '../../../components/ui/Icon';
import {useCallback,useRef,useState,type ReactNode} from 'react';
import {Pressable,ScrollView,View} from 'react-native';
import {AppText} from '../../../components/ui/AppText';
import {Button} from '../../../components/ui/Button';
import {Card} from '../../../components/ui/Card';
import {AdminDesk} from './AdminDesk';
import {SupportOverview} from './SupportOverview';
import {AdminTeam} from './AdminTeam';
import {RecoveryPanel} from './RecoveryPanel';
import {AdminFinance} from '../../finance/screens/AdminFinance';
import {BackofficePanel} from '../../backoffice/BackofficePanel';
import {officeText,type OfficeLocale,type OfficeMode} from '../../backoffice/messages';
import {uxText} from '../ux-messages';
import type {AdminApi} from '../api/admin-api';
import type {Domain} from '../models';
import type {Translate} from './presentation';
export function P2Desk({client,grants,t,locale,fail,lock,owner,tools}:{client:AdminApi;grants:string[];t:Translate;locale:OfficeLocale;fail:(e:unknown)=>void;lock:()=>void;owner:string;tools?:ReactNode}){
 const scroll=useRef<ScrollView>(null),resetScroll=useCallback(()=>scroll.current?.scrollTo({y:0,animated:false}),[]);
 const u=(k:string)=>uxText(locale,k),primary=[...(grants.includes('support.read')?['overview','reports']:[]),...(grants.includes('grant.manage')?['grants']:[]),'more'];
 const others=[...(grants.includes('accounts.manage')?['users','recovery','deletion']:[]),...(grants.includes('catalog.manage')?['categories','skills']:[]),...(grants.includes('moderation.manage')?['verifications','reviews','partners']:[]),...(grants.includes('audit.read')?['audit']:[]),...(grants.includes('finance.read')?['finance','invoices']:[]),...(grants.includes('reports.read')?['metrics','jobs']:[])];
 const [tab,setTab]=useState(primary[0]==='more'?others[0]??'more':primary[0]),label=(s:string)=>['users','categories','skills','verifications','reviews','partners','audit'].includes(s)?t(s):officeText(locale,s);
 return <View style={{flex:1}}><ScrollView ref={scroll} key={tab} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{padding:16,gap:20,width:'100%',maxWidth:900,alignSelf:'center'}}>
 {tab==='overview'||tab==='reports'?<SupportOverview onDetailChange={resetScroll} key={tab} queue={tab==='reports'} client={client} grants={grants} t={t} locale={locale} fail={fail} lock={lock}/>:tab==='grants'?<AdminTeam client={client} grants={grants} owner={owner} locale={locale} fail={fail}/>:tab==='more'?<><AppText variant="title">{u('more')}</AppText><Card>{others.map(s=><Button key={s} label={label(s)} variant="secondary" testID={'admin-tab-'+s} onPress={()=>setTab(s)}/>)}</Card>{tools}</>:<><Button label={t('back')} variant="link" onPress={()=>setTab('more')}/>{tab==='finance'?<AdminFinance client={client} locale={locale} grants={grants} fail={fail}/>:tab==='recovery'||tab==='deletion'?<RecoveryPanel key={tab} client={client} domain={tab==='recovery'?'recovery-reports':'account-deletions'} fail={fail}/>:['metrics','jobs','invoices'].includes(tab)?<BackofficePanel key={tab} client={client} mode={tab as OfficeMode} locale={locale} grants={grants} owner={owner} fail={fail}/>:<AdminDesk key={tab} initialDomain={tab as Domain|'audit'} client={client} grants={grants} t={t} locale={locale} fail={fail} lock={lock}/>}</>}
 </ScrollView><View style={{flexDirection:'row',backgroundColor:'white',borderTopWidth:1,borderTopColor:'#dfe6ed',padding:8,gap:4}}>{primary.map(s=><Pressable key={s} testID={'p2-admin-'+s} accessibilityRole="tab" accessibilityLabel={u(s)} accessibilityState={{selected:tab===s||s==='more'&&!primary.includes(tab)}} onPress={()=>setTab(s)} style={{flex:1,minHeight:56,alignItems:'center',justifyContent:'center',gap:4,borderRadius:8,backgroundColor:tab===s?'#edf3ff':'white'}}><Icon name={({overview:'grid',reports:'messages',grants:'jobs',more:'filters'} as Record<string,IconName>)[s]} color={tab===s?'#2457d6':'#607286'}/><AppText variant="caption" tone={tab===s?'primary':'muted'}>{u(s==='overview'?s:s+'Short')}</AppText></Pressable>)}</View></View>;
}
