import {useEffect,useRef,useState} from 'react';
import {Switch,View} from 'react-native';
import {randomUUID} from 'expo-crypto';
import {AppText} from '../../../components/ui/AppText';
import {Button} from '../../../components/ui/Button';
import {Input} from '../../../components/ui/Input';
import type {AdminApi} from '../api/admin-api';
import type {Domain,Item} from '../models';
import {codeOf,errorText,type Translate} from './presentation';
import {AdminChoice} from './AdminChoice';
export function AdminDecision({item,domain,client,t,allowed,saved,fail,reload}:{item:Item;domain:Domain;client:AdminApi;t:Translate;allowed:boolean;saved:(r:Item)=>void;fail:(e:unknown)=>void;reload:()=>void}){
 const choices=domain==='reports'?['reviewing','awaiting_evidence','resolved','closed']:domain==='verifications'?['request_evidence','reject','approve']:['keep','hide','unhide'];
 const [action,setAction]=useState(choices[0]),[reason,setReason]=useState(''),[checked,setChecked]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pending=useRef<{input:unknown;key:string}|null>(null),live=useRef(true),sending=useRef(false);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 const submit=async()=>{
  if(sending.current)return;sending.current=true;
  const task=pending.current??{key:randomUUID(),input:{expected_version:item.version,...(domain==='reports'?{state:action}:{action}),reason:reason.trim(),...(domain==='verifications'?{checked}:{})}};
  pending.current=task;setBusy(true);setError('');
  try{const r=await client.decision(domain,item.id,task.input,task.key);if(live.current){pending.current=null;saved(r);}}
  catch(e){if(live.current){const c=codeOf(e);setError(c);if(!['NETWORK','TIMEOUT','SERVICE_UNAVAILABLE','INTERNAL','INVALID_RESPONSE'].includes(c))pending.current=null;if(['FORBIDDEN','REAUTH_REQUIRED','UNAUTHENTICATED'].includes(c))fail(e);}}
  finally{sending.current=false;if(live.current)setBusy(false);}
 };
 if(!allowed||domain==='reports'&&item.state==='closed'||domain==='verifications'&&item.state!=='pending')return <AppText>{t('readOnly')}</AppText>;
 return <View style={{gap:12}}><AdminChoice id="admin-action" label={t('decision')} value={action} choices={choices} onChange={setAction} disabled={busy||!!pending.current} t={t}/>
 <Input testID="admin-reason" label={t('reason')} multiline value={reason} onChangeText={setReason} maxLength={4000} editable={!busy&&!pending.current} style={{minHeight:110,textAlignVertical:'top'}}/>
 {domain==='verifications'&&<View><AppText>{t('checked')}</AppText><Switch testID="admin-checked" accessibilityLabel={t('checked')} value={checked} onValueChange={setChecked} disabled={busy||!!pending.current}/></View>}
 {error&&<AppText tone="error" accessibilityRole="alert">{errorText(error,t)}</AppText>}
 {['VERSION_CONFLICT','STATE_CONFLICT'].includes(error)?<Button label={t('refresh')} onPress={reload}/>:<Button testID="admin-save" label={t(pending.current?'retry':'save')} loading={busy} disabled={!reason.trim()||domain==='verifications'&&action==='approve'&&!checked} onPress={()=>void submit()}/>}
 </View>;
}
