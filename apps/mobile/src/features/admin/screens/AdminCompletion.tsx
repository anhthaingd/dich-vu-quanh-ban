import {formatInteger} from '../../invoices/format-amount';
import {useEffect,useRef,useState} from 'react';
import {Switch,View} from 'react-native';
import {randomUUID} from 'expo-crypto';
import {AppText} from '../../../components/ui/AppText';
import {Button} from '../../../components/ui/Button';
import {Input} from '../../../components/ui/Input';
import {Card} from '../../../components/ui/Card';
import type {AdminApi} from '../api/admin-api';
import type {Item,CompletionPreview} from '../models';
import {codeOf,errorText,type Translate} from './presentation';
export function AdminCompletion({item,client,t,locale,fail,reload}:{item:Item;client:AdminApi;t:Translate;locale:string;fail:(e:unknown)=>void;reload:()=>void}){
 const [preview,setPreview]=useState<CompletionPreview|null>(null),[reason,setReason]=useState(''),[checked,setChecked]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[expired,setExpired]=useState(false),[done,setDone]=useState(false);
 const pending=useRef<{input:unknown;key:string}|null>(null),live=useRef(true),sending=useRef(false);
 const evidence=[...new Set([...(item.evidence_ids??[]),...(item.updates??[]).flatMap(u=>u.evidence_ids)])];
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 useEffect(()=>{if(!preview)return;const timer=setTimeout(()=>setExpired(true),Math.max(0,Date.parse(preview.expires_at)-Date.now()));return()=>clearTimeout(timer);},[preview]);
 const handle=(e:unknown)=>{const c=codeOf(e);setError(c);if(['FORBIDDEN','REAUTH_REQUIRED','UNAUTHENTICATED'].includes(c))fail(e);return c;};
 const load=async()=>{if(sending.current)return;sending.current=true;setBusy(true);setError('');try{const p=await client.completionPreview(item.id);if(live.current){setPreview(p);setExpired(false);}}catch(e){if(live.current)handle(e);}finally{sending.current=false;if(live.current)setBusy(false);}};
 const submit=async()=>{if(sending.current||!preview||!pending.current&&(expired||!checked||!reason.trim()))return;sending.current=true;
  const task=pending.current??{key:randomUUID(),input:{expected_version:item.version,invoice_id:preview.invoice_id,invoice_version_id:preview.invoice_version_id,invoice_expected_version:preview.invoice_expected_version,reason:reason.trim(),evidence_ids:evidence,preview_token:preview.preview_token,checked:true}};
  pending.current=task;setBusy(true);setError('');try{await client.complete(item.id,task.input,task.key);if(live.current){pending.current=null;setDone(true);reload();}}catch(e){if(live.current){const c=handle(e);if(!['NETWORK','TIMEOUT','SERVICE_UNAVAILABLE','INTERNAL','INVALID_RESPONSE'].includes(c))pending.current=null;}}finally{sending.current=false;if(live.current)setBusy(false);}
 };
 if(done)return <AppText tone="success" accessibilityRole="alert">{t('completionDone')}</AppText>;
 const conflict=['VERSION_CONFLICT','STATE_CONFLICT'].includes(error);
 return <Card testID="admin-completion"><AppText variant="section">{t('completion')}</AppText><AppText tone="muted">{t('completionHint')}</AppText>
 {preview&&<><View style={{gap:8}}>{(['total','cash_due','fee','points_used','reward','partner_delta'] as const).map(k=><View key={k}><AppText tone="muted">{t(k)}</AppText><AppText variant="card">{formatInteger(preview[k],locale)}{['points_used','reward'].includes(k)?' point':' ₫'}</AppText></View>)}</View><AppText variant="caption">{t('completionExpires')}: {new Date(preview.expires_at).toLocaleTimeString(locale)}</AppText><AppText>{t('completionEvidence')}: {evidence.length}</AppText>
 <Input testID="completion-reason" label={t('completionReason')} multiline maxLength={4000} value={reason} onChangeText={setReason} editable={!busy&&!pending.current} style={{minHeight:100}}/>
 <AppText>{t('completionChecked')}</AppText><Switch testID="completion-checked" accessibilityLabel={t('completionChecked')} value={checked} onValueChange={setChecked} disabled={busy||!!pending.current}/></>}
 {error&&<AppText tone="error" accessibilityRole="alert">{errorText(error,t)}</AppText>}{expired&&!pending.current&&<AppText tone="error">{t('previewExpired')}</AppText>}
 {conflict||expired&&!pending.current?<Button label={t('refresh')} onPress={reload}/>:preview?<Button testID="completion-confirm" label={t(pending.current?'retry':'completionConfirm')} loading={busy} disabled={!pending.current&&(!checked||!reason.trim())} onPress={()=>void submit()}/>:<Button testID="completion-preview" label={t('completionPreview')} loading={busy} onPress={()=>void load()}/>}
 </Card>;
}
