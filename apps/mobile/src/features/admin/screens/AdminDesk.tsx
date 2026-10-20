import {CatalogEditor} from './CatalogEditor';
import {AdminCompletion} from './AdminCompletion';
import {useEffect,useRef,useState} from 'react';
import {BackHandler,Image,View} from 'react-native';
import {AppText} from '../../../components/ui/AppText';
import {Button} from '../../../components/ui/Button';
import {Input} from '../../../components/ui/Input';
import {Card} from '../../../components/ui/Card';
import type {AdminApi} from '../api/admin-api';
import type {Audit,Domain,Item} from '../models';
import {codeOf,errorText,type Translate} from './presentation';
import {AdminDecision} from './AdminDecision';
import {AdminChoice} from './AdminChoice';
const states:Record<Domain,string[]>={users:['active','suspended','deletion_requested','anonymized'],partners:['active','new_work_suspended','suspended'],categories:['active','inactive'],skills:['active','inactive'],reports:['open','reviewing','awaiting_evidence','resolved','closed'],verifications:['pending','awaiting_evidence','approved','rejected'],reviews:['visible','hidden','removed']};
function Photo({id,client,t,fail}:{id:string;client:AdminApi;t:Translate;fail:(e:unknown)=>void}){
 const [uri,setUri]=useState(''),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let live=true;setUri('');setError(false);void client.photo(id).then(value=>{if(live)setUri(value);}).catch(e=>{if(live){setError(true);if(['FORBIDDEN','UNAUTHENTICATED'].includes(codeOf(e)))fail(e);}});return()=>{live=false;};},[id,client,attempt]);
 return error?<Button label={t('photoError')+' · '+t('retry')} onPress={()=>setAttempt(n=>n+1)}/>:uri?<Image accessibilityLabel={t('photo')} source={{uri}} resizeMode="contain" style={{width:'100%',height:260}}/>:<AppText>{t('load')}</AppText>;
}
export function AdminDesk({client,grants,t,locale,fail,lock}:{client:AdminApi;grants:string[];t:Translate;locale:string;fail:(e:unknown)=>void;lock:()=>void}){
 const sections=[...(grants.includes('accounts.manage')?['users' as const]:[]),...(grants.includes('catalog.manage')?['categories' as const,'skills' as const]:[]),...(grants.includes('support.read')?['reports' as const]:[]),...(grants.includes('moderation.manage')?['verifications' as const,'reviews' as const,'partners' as const]:[]),...(grants.includes('audit.read')?['audit' as const]:[])];
 const [domain,setDomain]=useState<Domain|'audit'>(sections[0]??'reports'),[items,setItems]=useState<Item[]>([]),[audit,setAudit]=useState<Audit[]>([]),[cursor,setCursor]=useState<string|null>(null),[selected,setSelected]=useState<Item|null>(null),[q,setQ]=useState(''),[state,setState]=useState('all'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[loaded,setLoaded]=useState(false),[request,setRequest]=useState(0);
 const generation=useRef(0),alive=useRef(true),params=useRef({q:'',state:'all'});
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;generation.current++;};},[]);
 useEffect(()=>{if(!selected)return;const sub=BackHandler.addEventListener('hardwareBackPress',()=>{setSelected(null);setNotice('');return true;});return()=>sub.remove();},[selected]);
 const handle=(e:unknown)=>{if(!alive.current)return;const c=codeOf(e);if(c==='CANCELLED')return;setError(c);if(['FORBIDDEN','UNAUTHENTICATED','REAUTH_REQUIRED'].includes(c)){setItems([]);setAudit([]);setSelected(null);fail(e);}};
 const load=async(more=false)=>{
  const gen=++generation.current;setBusy(true);setError('');
  try{if(domain==='audit'){const p=await client.audit(more?cursor??undefined:undefined);if(gen===generation.current&&alive.current){setAudit(all=>more?[...all,...p.items]:p.items);setCursor(p.next_cursor);}}
   else{const p=await client.page(domain,params.current.q,params.current.state,more?cursor??undefined:undefined);if(gen===generation.current&&alive.current){setItems(all=>more?[...all,...p.items]:p.items);setCursor(p.next_cursor);}}
   if(gen===generation.current&&alive.current)setLoaded(true);
  }catch(e){if(gen===generation.current)handle(e);}finally{if(gen===generation.current&&alive.current)setBusy(false);}
 };
 useEffect(()=>{void load();return()=>{generation.current++;};},[domain,request]);
 const change=(next:Domain|'audit')=>{generation.current++;setDomain(next);setItems([]);setAudit([]);setSelected(null);setCursor(null);setQ('');setState('all');params.current={q:'',state:'all'};setError('');setNotice('');setLoaded(false);setRequest(n=>n+1);};
 const open=async(id:string)=>{if(domain==='audit')return;const gen=++generation.current;setBusy(true);setError('');try{const item=await client.item(domain,id);if(gen===generation.current&&alive.current)setSelected(item);}catch(e){if(gen===generation.current)handle(e);}finally{if(gen===generation.current&&alive.current)setBusy(false);}};
 const status=(r:Item)=>r.state??(r.removed?'removed':r.hidden?'hidden':'visible');
 const title=(r:Item)=>r.name??r.subject??r.partner_name??`${r.stars}/5 ${t('stars')}`;
 const format=(s:string)=>new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(s));
 return <View style={{gap:20}} testID="admin-desk">
 <AppText variant="title" accessibilityRole="header">{t('intro')}</AppText><AppText tone="muted">{t('subtitle')}</AppText>
 <Button testID="admin-lock" label={t('lock')} variant="secondary" onPress={lock}/>
 <View accessibilityRole="tablist" style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{sections.map(s=><Button key={s} testID={'admin-tab-'+s} label={t(s)} accessibilityRole="tab" accessibilityState={{selected:s===domain}} variant={s===domain?'primary':'secondary'} onPress={()=>change(s)}/>)}</View>
 {error&&<Card><AppText tone="error" accessibilityRole="alert">{errorText(error,t)}</AppText><Button label={t('retry')} disabled={busy} onPress={()=>selected?.id?void open(selected.id):void load()}/></Card>}
 {notice&&<AppText accessibilityLiveRegion="polite">{t(notice)}</AppText>}
 {busy&&<AppText accessibilityLiveRegion="polite">{t('load')}</AppText>}
 {(domain==='categories'||domain==='skills')&&!selected&&<Button testID="catalog-create" label={t('create')} onPress={()=>setSelected({id:'',version:1,name:'',state:'active',history:[]})}/>}
 {domain==='audit'?<Card><AppText variant="section">{t('history')}</AppText>{audit.map(h=><Card key={h.id}><AppText variant="card">{t(h.domain)} · {t(h.action)}</AppText><AppText>{h.reason}</AppText><AppText variant="caption">{h.resource_id} · {format(h.created_at)}</AppText></Card>)}{loaded&&!audit.length&&<AppText>{t('empty')}</AppText>}{cursor&&<Button label={t('more')} disabled={busy} onPress={()=>void load(true)}/>}</Card>
 :selected?<Card testID="admin-detail"><Button testID="admin-close-detail" label={t('close')} variant="link" onPress={()=>{setSelected(null);setNotice('');}}/><AppText variant="section">{selected.id?title(selected):t('create')}</AppText><AppText tone="primary">{t(status(selected))}</AppText><AppText variant="caption">{selected.id}</AppText>
 {selected.contacts?.map(c=><AppText key={c.kind}>{c.value}</AppText>)}{selected.open_jobs!==undefined&&<AppText>{t('openJobs')}: {selected.open_jobs}</AppText>}
 {selected.reporter_name&&<AppText>{t('sender')}: {selected.reporter_name}</AppText>}{selected.details&&<><AppText variant="card">{t(selected.details.kind)}</AppText><AppText>{selected.details.statement}</AppText></>}{selected.body&&<AppText>{selected.body}</AppText>}
 {[...(selected.document_asset_ids??selected.evidence_ids??[]),...(selected.asset_id?[selected.asset_id]:[])].map(id=><Photo key={id} id={id} client={client} t={t} fail={handle}/>)}
 {selected.updates?.map((u,i)=><Card key={i}><AppText>{u.body}</AppText>{u.evidence_ids.map(id=><Photo key={id} id={id} client={client} t={t} fail={handle}/>)}<AppText variant="caption">{format(u.created_at)}</AppText></Card>)}
 <AppText tone="muted">{t(domain==='users'?'accountHint':domain==='partners'?'partnerHint':domain==='categories'||domain==='skills'?'catalogHint':domain==='reports'?'noMoney':domain==='reviews'?'noEdit':'checked')}</AppText>
 {!!selected.history.length&&<AppText variant="card">{t('history')}</AppText>}{selected.history.map((h,i)=><Card key={i}><AppText>{t(h.action)}</AppText><AppText>{h.reason}</AppText><AppText variant="caption">{format(h.created_at)}</AppText></Card>)}
 {domain==='reports'&&selected.invoice_id&&selected.state!=='closed'&&grants.includes('finance.review')&&!selected.history.some(h=>h.action==='complete_on_behalf')&&<AdminCompletion key={`complete:${selected.id}:${selected.version}`} item={selected} client={client} t={t} locale={locale} fail={handle} reload={()=>void open(selected.id)}/>}
 {(domain==='categories'||domain==='skills')?<CatalogEditor key={`${domain}:${selected.id}:${selected.version}`} domain={domain} item={selected.id?selected:null} client={client} t={t} saved={r=>{setSelected(r);setRequest(n=>n+1);}} fail={handle} reload={()=>void open(selected.id)}/>:<AdminDecision key={`${domain}:${selected.id}:${selected.version}`} item={selected} domain={domain} client={client} t={t} allowed={domain!=='reports'||grants.includes('support.manage')} saved={r=>{setSelected(r);setItems(all=>all.map(x=>x.id===r.id?r:x));setNotice('saved');}} fail={handle} reload={()=>void open(selected.id)}/>}
 </Card>:<Card testID="admin-queue"><Input testID="admin-search" label={t('q')} value={q} onChangeText={setQ} maxLength={200}/><AdminChoice id="admin-filter" label={t('filter')} value={state} choices={['all',...states[domain]]} onChange={setState} t={t}/>
 <Button testID="admin-search-submit" label={t('search')} disabled={busy} onPress={()=>{setItems([]);setCursor(null);params.current={q,state};setRequest(n=>n+1);}}/>
 <AppText tone="muted">{items.length} · {t('found')}</AppText>{items.map(r=><Button key={r.id} testID={'admin-item-'+r.id} label={title(r)+' · '+t(status(r))} variant="secondary" disabled={busy} onPress={()=>void open(r.id)}/>)}{loaded&&!items.length&&<AppText>{t('empty')}</AppText>}{cursor&&<Button label={t('more')} disabled={busy} onPress={()=>void load(true)}/>}</Card>}
 </View>;
}
