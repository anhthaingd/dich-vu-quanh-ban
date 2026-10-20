import {useEffect,useRef,useState} from 'react';
import {AdminClient,ClientError,type Item} from './client';
export function CatalogEditor({domain,item,client,t,saved,fail,reload}:{domain:string;item:Item|null;client:AdminClient;t:(k:string)=>string;saved:(r:Item)=>void;fail:(e:unknown)=>void;reload:()=>void}){
 const [name,setName]=useState(item?.name??''),[code,setCode]=useState(''),[parent,setParent]=useState('root'),[active,setActive]=useState(item?.state??'active'),[reason,setReason]=useState(''),[parents,setParents]=useState<Item[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 const pending=useRef<{input:unknown;key:string}|null>(null),live=useRef(true),sending=useRef(false);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 useEffect(()=>{if(item)return;let valid=true;setBusy(true);setError('');void(async()=>{
  const all:Item[]=[],seen=new Set<string>();let cursor:string|undefined;
  do{const p=await client.page('categories','?'+new URLSearchParams({state:'active',...(cursor?{cursor}:{})}));all.push(...p.items);cursor=p.next_cursor??undefined;if(cursor&&seen.has(cursor))throw new Error('cursor');if(cursor)seen.add(cursor);}while(cursor&&valid);
  if(valid)setParents(all);
 })().catch(e=>{if(valid){setError('network');fail(e);}}).finally(()=>{if(valid)setBusy(false);});return()=>{valid=false;};},[client,item,attempt]);
 const send=async()=>{if(sending.current)return;sending.current=true;const request=pending.current??{key:crypto.randomUUID(),input:{...(item?{expected_version:item.version}:{code,...(domain==='skills'?{category_ids:[parent]}:parent==='root'?{}:{parent_id:parent})}),name_vi:name,active:active==='active',reason}};pending.current=request;setBusy(true);setError('');
  try{const r=await client.saveCatalog(domain,item?.id??null,request.input,request.key);if(live.current){pending.current=null;saved(r);}}
  catch(e){if(live.current){const c=e instanceof ClientError?e.code:'NETWORK';setError(c==='VERSION_CONFLICT'||c==='STATE_CONFLICT'?'conflict':c==='NETWORK'?'network':'failed');if(!['NETWORK','INVALID_RESPONSE','BUSY','TIMEOUT','SERVICE_UNAVAILABLE','INTERNAL'].includes(c))pending.current=null;fail(e);}}
  finally{sending.current=false;if(live.current)setBusy(false);}
 };
 const locked=busy||!!pending.current,choices=parents.filter(p=>domain==='skills'?p.parent_id!==null:p.parent_id===null);
 return <form onSubmit={e=>{e.preventDefault();void send();}}><fieldset disabled={locked}>
 {!item&&<label>{t('stableCode')}<input data-testid="catalog-code" value={code} onChange={e=>setCode(e.target.value)} required pattern="[a-z][a-z0-9_]*"/></label>}
 <label>{t('name')}<input data-testid="catalog-name" value={name} onChange={e=>setName(e.target.value)} required maxLength={200}/></label>
 {!item&&<label>{t('parent')}<select value={parent} onChange={e=>setParent(e.target.value)}><option value="root">{t(domain==='categories'?'root':'choose')}</option>{choices.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
 <label>{t('filter')}<select value={active} onChange={e=>setActive(e.target.value)}>{['active','inactive'].map(s=><option value={s} key={s}>{t(s)}</option>)}</select></label>
 <label>{t('reason')}<textarea data-testid="catalog-reason" value={reason} onChange={e=>setReason(e.target.value)} required maxLength={1000}/></label></fieldset>
 {error&&<p role="alert">{t(error)}</p>}{error&&!pending.current&&<button type="button" disabled={busy} onClick={()=>item?reload():setAttempt(n=>n+1)}>{t('refresh')}</button>}
 <button data-testid="catalog-save" disabled={busy||!name.trim()||!reason.trim()||(!item&&(!code.trim()||domain==='skills'&&parent==='root'))||error==='conflict'}>{t(pending.current?'retry':'save')}</button></form>;
}
