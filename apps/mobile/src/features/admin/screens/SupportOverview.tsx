import {formatInteger} from '../../invoices/format-amount';
import {useCallback,useMemo,useState} from 'react';
import {Pressable,View} from 'react-native';
import {AppText} from '../../../components/ui/AppText';
import {Button} from '../../../components/ui/Button';
import {SegmentedTabs} from '../../../components/ui/SegmentedTabs';
import type {AdminApi} from '../api/admin-api';
import {useSupportOverview} from '../useSupportOverview';
import {uxText,type UxLocale} from '../ux-messages';
import {AdminDesk} from './AdminDesk';
import type {Translate} from './presentation';
export function SupportOverview({client,locale,fail,grants,t,lock,queue=false,onDetailChange}:{onDetailChange?:()=>void;client:AdminApi;locale:UxLocale;fail:(e:unknown)=>void;grants:string[];t:Translate;lock:()=>void;queue?:boolean}){
 const request=useMemo(()=>(path:string)=>client.request(path,(v):v is unknown=>v!==undefined),[client]),m=useSupportOverview(request,fail),u=(k:string)=>uxText(locale,k),[state,setState]=useState(queue?'all':'open'),[detail,setDetail]=useState(false);
 const changeDetail=useCallback((open:boolean)=>{setDetail(open);onDetailChange?.();},[onDetailChange]);
 return <View style={{gap:16}}><View style={{gap:16,display:detail?'none':'flex'}}><AppText variant="title" accessibilityRole="header">{u(queue?'reports':'overview')}</AppText><AppText tone="muted">{u('periodHint')}</AppText><SegmentedTabs value={String(m.days)} onChange={v=>m.change(Number(v))} accessibilityLabel={u('period')} options={[{value:'7',label:u('days7')},{value:'30',label:u('days30')}]}/>
 {m.error&&<AppText tone="error" accessibilityRole="alert">{u('error')}</AppText>}<View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>{['open','reviewing','awaiting_evidence','done'].map(s=><Pressable key={s} accessibilityRole="button" accessibilityState={{selected:state===s}} onPress={()=>setState(s)} style={{flexBasis:'46%',flexGrow:1,padding:16,gap:10,backgroundColor:'white',borderRadius:12,borderWidth:1,borderColor:state===s?'#2457d6':'#dfe6ed'}}><AppText variant="caption" tone="muted">{s==='done'?t('resolved')+' / '+t('closed'):t(s)}</AppText><AppText variant="title">{m.counts?formatInteger(s==='done'?(BigInt(m.counts.resolved)+BigInt(m.counts.closed)).toString():m.counts[s],locale):'—'}</AppText></Pressable>)}</View><AppText variant="caption" tone="muted">{new Date(m.period.from).toLocaleString(locale)} — {new Date(m.period.to).toLocaleString(locale)}</AppText><Button label={t('refresh')} variant="secondary" loading={m.busy} onPress={m.refresh}/>
 </View><AdminDesk onDetailChange={changeDetail} key={JSON.stringify(m.period)+state} initialDomain="reports" initialState={state} range={m.period} client={client} grants={grants} t={t} locale={locale} fail={fail} lock={lock}/></View>;
}
