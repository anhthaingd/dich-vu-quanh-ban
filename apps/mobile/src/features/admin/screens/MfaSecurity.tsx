import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {Switch} from 'react-native';
import {useLocale} from '../../../app/providers/LocaleProvider';
import {AppText} from '../../../components/ui/AppText';
import {Button} from '../../../components/ui/Button';
import {Input} from '../../../components/ui/Input';
import {Card} from '../../../components/ui/Card';
import {AdminApi} from '../api/admin-api';
import {mfaText} from '../mfa-messages';
import {Mutation} from '../../jobs/state/mutation';
import {record} from '../../jobs/api/jobs-api';
type Target={id:string;name:string;version:number};
const target=(v:unknown):v is Target=>record(v)&&typeof v.id==='string'&&typeof v.name==='string'&&Number.isSafeInteger(v.version);
export function MfaSecurity({client,owner,canReset,fail,replaced}:{client:AdminApi;owner:string;canReset:boolean;replaced:(secret:string)=>void;fail:(e:unknown)=>void}){
 const {locale}=useLocale(),t=mfaText(locale),[open,setOpen]=useState(false),[codes,setCodes]=useState<string[]>([]),[id,setId]=useState(''),[selected,setSelected]=useState<Target|null>(null),[reason,setReason]=useState(''),[checked,setChecked]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(false),[done,setDone]=useState(false);
 const [password,setPassword]=useState('');
 const live=useRef(true);useEffect(()=>()=>{live.current=false;},[]);
 const [mutation]=useState(()=>new Mutation<Record<string,unknown>>()),m=useSyncExternalStore(mutation.subscribe,mutation.getSnapshot,mutation.getSnapshot),blocked=busy||m.busy||m.pending;
 const run=async(work:()=>Promise<void>)=>{setBusy(true);setError(false);try{await work();}catch(e){if(live.current){setError(true);fail(e);}}finally{if(live.current)setBusy(false);}};
 const finish=(r:Record<string,unknown>|null)=>{if(r&&live.current){setSelected(null);setId('');setReason('');setChecked(false);setDone(true);}};
 return <Card><Button testID="mfa-security-toggle" label={t.title} variant="secondary" disabled={blocked} onPress={()=>{setOpen(!open);setCodes([]);}}/>{open&&<><AppText>{t.hint}</AppText><Button testID="mfa-generate" label={t.backup} disabled={blocked} onPress={()=>void run(async()=>{setCodes([]);const v=await client.backupCodes();if(live.current)setCodes(v);})}/>{!!codes.length&&<><AppText selectable testID="mfa-backup-codes">{codes.join('\n')}</AppText><Button label={t.hide} onPress={()=>setCodes([])}/></>}<AppText>{t.replaceHint}</AppText><Input label={t.password} value={password} onChangeText={setPassword} secureTextEntry maxLength={128} editable={!blocked}/><Button label={t.replace} disabled={blocked||!password} onPress={()=>void run(async()=>{const r=await client.replace(password);if(live.current){setPassword('');replaced(r.secret);}})}/>{canReset&&<><Input label={t.target} testID="mfa-target" value={id} autoCapitalize="none" editable={!blocked} onChangeText={v=>{setId(v);setSelected(null);setDone(false);}}/><Button label={t.load} testID="mfa-target-load" disabled={blocked||id===owner||!/^[a-f0-9-]{36}$/i.test(id)} onPress={()=>void run(async()=>{const r=await client.request('/admin/users/'+encodeURIComponent(id)+'/grants',target);if(live.current){setSelected(r);setChecked(false);}})}/>{selected&&<><AppText>{selected.name} · {selected.id}</AppText><Input testID="mfa-reset-reason" label={t.reason} value={reason} maxLength={1000} editable={!blocked} onChangeText={setReason}/><AppText>{t.checked}</AppText><Switch testID="mfa-reset-checked" accessibilityLabel={t.checked} value={checked} disabled={blocked} onValueChange={setChecked}/><Button testID="mfa-reset" label={m.pending?t.retry:t.reset} disabled={busy||m.busy||!checked||!reason.trim()} onPress={()=>{const input={expected_version:selected.version,reason};void (m.pending?mutation.run():mutation.run(k=>client.request('/admin/auth/users/'+selected.id+'/reset',record,input,k))).then(finish);}}/></>}{done&&<AppText accessibilityRole="alert">{t.done}</AppText>}</>}{(error||m.error)&&<AppText tone="error" accessibilityRole="alert">{t.failed}</AppText>}</>}</Card>;
}
