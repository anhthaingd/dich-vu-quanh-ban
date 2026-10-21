import {randomUUID} from 'expo-crypto';
import {useEffect,useRef,useState} from 'react';
import {useLocale} from '../../../app/providers/LocaleProvider';
import {ProductShell} from '../../../app/layout/ProductShell';
import {AppText} from '../../../components/ui/AppText';
import {Input} from '../../../components/ui/Input';
import {Button} from '../../../components/ui/Button';
import {Card} from '../../../components/ui/Card';
import {createSecurityApi,type Challenge,type RecoveryStatus} from '../api/security-api';
import {securityMessages,securityState} from '../messages';
const api=createSecurityApi();
export function RecoveryScreen({back}:{back:()=>void}){
 const {locale}=useLocale(),t=securityMessages(locale);
 const [old,setOld]=useState(''),[next,setNext]=useState(''),[evidence,setEvidence]=useState(''),[id,setId]=useState(''),[receipt,setReceipt]=useState(''),[status,setStatus]=useState<RecoveryStatus|null>(null),[challenge,setChallenge]=useState<Challenge|null>(null),[code,setCode]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState<'failed'|'success'|null>(null);
 const requestReceipt=useRef<{token:string;input:string}|null>(null);
 const alive=useRef(true);useEffect(()=>()=>{alive.current=false;},[]);
 async function work(task:()=>Promise<void>){setBusy(true);setNotice(null);try{await task();}catch{if(alive.current)setNotice('failed');}finally{if(alive.current)setBusy(false);}}
 return <ProductShell onBack={back}><AppText variant="title">{t.recovery}</AppText><AppText tone="muted">{t.notice}</AppText><Card>
  {!id&&<><Input label={t.old} value={old} onChangeText={setOld} autoCapitalize="none" editable={!busy}/><Input label={t.next} value={next} onChangeText={setNext} autoCapitalize="none" editable={!busy}/><Input label={t.evidence} value={evidence} onChangeText={setEvidence} multiline maxLength={4000} editable={!busy}/><Button label={t.submit} disabled={busy||!old.trim()||!next.trim()||!evidence.trim()} onPress={()=>void work(async()=>{const input=JSON.stringify({old,next,evidence}),task=requestReceipt.current?.input===input?requestReceipt.current:{input,token:randomUUID().replace(/-/g,'')+randomUUID().replace(/-/g,'')};requestReceipt.current=task;const r=await api.recover(old,next,evidence,task.token);if(alive.current){requestReceipt.current=null;setId(r.id);setReceipt(r.receipt_token);setStatus(r);setEvidence('');}})}/></>}
  <Input label={t.receiptId} value={id} onChangeText={v=>{setId(v);setStatus(null);setChallenge(null);}} autoCapitalize="none" editable={!busy}/><Input label={t.receipt} value={receipt} onChangeText={v=>{setReceipt(v);setStatus(null);setChallenge(null);}} autoCapitalize="none" autoCorrect={false} editable={!busy}/>
  <Button label={t.check} disabled={busy||!id||!receipt} onPress={()=>void work(async()=>{const r=await api.status(id,receipt);if(alive.current)setStatus(r);})}/>
  {status&&<><AppText>{t.status}: {securityState(locale,status.state)}</AppText>{status.reason&&<AppText>{status.reason}</AppText>}{['pending','awaiting_evidence'].includes(status.state)&&<><Input label={t.evidence} value={evidence} onChangeText={setEvidence} multiline maxLength={4000} editable={!busy}/><Button label={t.supplement} disabled={busy||!evidence.trim()} onPress={()=>void work(async()=>{const r=await api.supplement(id,receipt,evidence);if(alive.current){setStatus(r);setEvidence('');}})}/></>}{status.state==='approved'&&<><AppText>{t.approved}</AppText>{!challenge?<Button label={t.send} disabled={busy} onPress={()=>void work(async()=>{const r=await api.recoveryChallenge(id,receipt);if(alive.current)setChallenge(r);})}/>:<><Input label={t.code} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} editable={!busy}/><Input label={t.newPassword} value={password} onChangeText={setPassword} secureTextEntry editable={!busy}/><Button label={t.confirm} disabled={busy||code.length!==6||password.length<15} onPress={()=>void work(async()=>{await api.confirm('recovery',challenge.id,code,password,undefined,receipt);if(alive.current){setPassword('');setCode('');setChallenge(null);setStatus(await api.status(id,receipt));setNotice('success');}})}/></>}</>}</>}
  {notice&&<AppText accessibilityRole={notice==='failed'?'alert':'text'} tone={notice==='failed'?'error':'primary'}>{t[notice]}</AppText>}
 </Card><Button label={t.back} variant="link" onPress={back}/></ProductShell>;
}
