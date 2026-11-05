import {useMemo} from 'react';
import type {ReactNode} from 'react';
import type {AdminClient} from './client';
import {useSupportOverview,type SupportRange} from './useSupportOverview';
import {uxText} from './ux-messages';
import {translator,type Locale} from './i18n';
export function SupportOverview({client,locale,fail,renderQueue,queue=false}:{queue?:boolean;client:AdminClient;locale:Locale;fail:(e:unknown)=>void;renderQueue:(range:SupportRange,state:string)=>ReactNode}){
 const request=useMemo(()=>(path:string)=>client.call(path),[client]),m=useSupportOverview(request,fail),u=(k:string)=>uxText(locale,k),t=translator(locale);
 // Changing a count remounts the queue, binding its pagination to this exact period and state.
 return <SupportContent queue={queue} m={m} locale={locale} u={u} t={t} renderQueue={renderQueue}/>;
}
import {useState} from 'react';
function SupportContent({m,locale,u,t,renderQueue,queue}:{queue:boolean;m:ReturnType<typeof useSupportOverview>;locale:Locale;u:(k:string)=>string;t:(k:string)=>string;renderQueue:(range:SupportRange,state:string)=>ReactNode}){
 const [state,setState]=useState(queue?'all':'open');
 return <section><header><div><p className="eyebrow">{u('reports')}</p><h1>{u(queue?'reports':'overview')}</h1><p className="muted">{u('periodHint')}</p></div><label>{u('period')}<select value={m.days} onChange={e=>m.change(Number(e.target.value))}><option value="7">{u('days7')}</option><option value="30">{u('days30')}</option></select></label><button className="secondary" onClick={m.refresh} disabled={m.busy}>{t('refresh')}</button></header>
 {m.error&&<p role="alert">{u('error')}</p>}<div className="support-stats">{['open','reviewing','awaiting_evidence','done'].map(s=><button key={s} className="stat" aria-pressed={state===s} onClick={()=>setState(s)}><span>{s==='done'?t('resolved')+' / '+t('closed'):t(s)}</span><strong>{m.counts?new Intl.NumberFormat(locale).format(s==='done'?BigInt(m.counts.resolved)+BigInt(m.counts.closed):BigInt(m.counts[s])):'—'}</strong><small>{t('choose')}</small></button>)}</div><p className="muted">{new Date(m.period.from).toLocaleString(locale)} — {new Date(m.period.to).toLocaleString(locale)}</p>{renderQueue(m.period,state)}</section>;
}
