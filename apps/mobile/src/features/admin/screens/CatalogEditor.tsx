import {useEffect,useRef,useState} from 'react';
import * as Crypto from 'expo-crypto';
import {View} from 'react-native';
import {Button} from '../../../components/ui/Button';
import {Input} from '../../../components/ui/Input';
import {AppText} from '../../../components/ui/AppText';
import {AdminChoice} from './AdminChoice';
import type {AdminApi} from '../api/admin-api';
import type {Domain,Item} from '../models';
import {codeOf,errorText,type Translate} from './presentation';
export function CatalogEditor({domain,item,client,t,saved,fail,reload}:{domain:Domain;item:Item|null;client:AdminApi;t:Translate;saved:(r:Item)=>void;fail:(e:unknown)=>void;reload:()=>void}){
 const [name,setName]=useState(item?.name??''),[code,setCode]=useState(''),[parent,setParent]=useState('root'),[active,setActive]=useState(item?.state??'active'),[reason,setReason]=useState(''),[parents,setParents]=useState<Item[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 const pending=useRef<{input:unknown;key:string}|null>(null),live=useRef(true),sending=useRef(false);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 useEffect(()=>{if(item)return;let valid=true;setBusy(true);setError('');void(async()=>{
  const all:Item[]=[],seen=new Set<string>();let cursor:string|undefined;
  do{const p=await client.page('categories','','active',cursor);all.push(...p.items);cursor=p.next_cursor??undefined;if(cursor&&seen.has(cursor))throw new Error('cursor');if(cursor)seen.add(cursor);}while(cursor&&valid);
  if(valid)setParents(all);
 })().catch(e=>{if(valid){setError(codeOf(e));fail(e);}}).finally(()=>{if(valid)setBusy(false);});return()=>{valid=false;};},[client,item,attempt]);
 const send=async()=>{if(sending.current)return;sending.current=true;const request=pending.current??{key:Crypto.randomUUID(),input:{...(item?{expected_version:item.version}:{code,...(domain==='skills'?{category_ids:[parent]}:parent==='root'?{}:{parent_id:parent})}),name_vi:name,active:active==='active',reason}};pending.current=request;setBusy(true);setError('');
  try{const r=await client.saveCatalog(domain,item?.id??null,request.input,request.key);if(live.current){pending.current=null;saved(r);}}
  catch(e){if(live.current){const c=codeOf(e);setError(c);if(!['NETWORK','INVALID_RESPONSE','BUSY','TIMEOUT','SERVICE_UNAVAILABLE','INTERNAL'].includes(c))pending.current=null;fail(e);}}
  finally{sending.current=false;if(live.current)setBusy(false);}
 };
 const locked=busy||!!pending.current,choices=parents.filter(p=>domain==='skills'?p.parent_id!==null:p.parent_id===null);
 return <View style={{gap:12}}>
 {!item&&<Input testID="catalog-code" label={t('stableCode')} value={code} editable={!locked} onChangeText={setCode} autoCapitalize="none"/>}
 <Input testID="catalog-name" label={t('name')} value={name} editable={!locked} onChangeText={setName}/>
 {!item&&<AdminChoice id="catalog-parent" label={t('parent')} choices={['root',...choices.map(p=>p.id)]} value={parent} disabled={locked} onChange={setParent} t={k=>k==='root'?t(domain==='categories'?'root':'choose'):choices.find(p=>p.id===k)?.name??t(k)}/>}
 <AdminChoice id="catalog-state" label={t('filter')} choices={['active','inactive']} value={active} disabled={locked} onChange={setActive} t={t}/>
 <Input testID="catalog-reason" label={t('reason')} value={reason} onChangeText={setReason} editable={!locked} multiline/>
 {error&&<AppText tone="error">{errorText(error,t)}</AppText>}
 {error&&!pending.current&&<Button label={t('refresh')} onPress={()=>item?reload():setAttempt(n=>n+1)} disabled={busy}/>}
 <Button testID="catalog-save" label={t(pending.current?'retry':'save')} disabled={busy||!name.trim()||!reason.trim()||(!item&&(!code.trim()||domain==='skills'&&parent==='root'))||['VERSION_CONFLICT','STATE_CONFLICT'].includes(error)} onPress={()=>void send()}/>
 </View>;
}
