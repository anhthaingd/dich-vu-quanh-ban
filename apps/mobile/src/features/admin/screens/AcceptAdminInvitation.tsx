import {useEffect,useMemo,useRef,useState} from 'react';
import {randomUUID} from 'expo-crypto';
import {useAuth} from '../../../app/providers/AuthProvider';
import {useLocale} from '../../../app/providers/LocaleProvider';
import {AppText} from '../../../components/ui/AppText';
import {Button} from '../../../components/ui/Button';
import {Input} from '../../../components/ui/Input';
import {Card} from '../../../components/ui/Card';
import {createAdminInvitationsApi,type InvitationPreview} from '../api/admin-invitations-api';
import {uxText} from '../ux-messages';
import {officeText} from '../../backoffice/messages';
import {codeOf} from './presentation';
export function AcceptAdminInvitation({owner,verified}:{owner:string;verified:boolean}){
 const {manager}=useAuth(),{locale}=useLocale(),u=(k:string)=>uxText(locale,k),t=(k:string)=>officeText(locale,k),api=useMemo(()=>createAdminInvitationsApi(process.env.EXPO_PUBLIC_API_URL),[]);
 const [expanded,setExpanded]=useState(false),[token,setToken]=useState(''),[preview,setPreview]=useState<InvitationPreview|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(false),[accepted,setAccepted]=useState(false),[pending,setPending]=useState<{token:string;key:string}|null>(null);
 const live=useRef(true),sending=useRef(false);useEffect(()=>{live.current=true;return()=>{live.current=false;};},[owner]);
 const run=async(accept=false)=>{if(sending.current)return;sending.current=true;setBusy(true);setError(false);try{if(accept){const task=pending??{token:token.trim(),key:randomUUID()};setPending(task);await manager.featureOperation(owner,a=>api.accept(a,task.token,task.key));if(live.current){setAccepted(true);setToken('');setPending(null);setPreview(null);}await manager.loadProfile(owner);}else{const r=await manager.featureOperation(owner,a=>api.preview(a,token.trim()));if(live.current)setPreview(r);}}catch(e){if(live.current){setError(true);if(!['NETWORK','TIMEOUT','SERVICE_UNAVAILABLE','INTERNAL','INVALID_RESPONSE'].includes(codeOf(e)))setPending(null);}}finally{sending.current=false;if(live.current)setBusy(false);}};
 return <Card><Button label={u('receive')} variant="link" disabled={busy||!!pending} onPress={()=>setExpanded(!expanded)}/>{expanded&&<><AppText tone="muted">{u('inviteHint')}</AppText>{!verified?<AppText>{u('verified')}</AppText>:accepted?<><AppText>{u('acceptedHint')}</AppText><Button label={t('refresh')} onPress={()=>void manager.loadProfile(owner)}/></>:<><Input label={u('token')} value={token} onChangeText={v=>{setToken(v);setPreview(null);}} autoCapitalize="none" autoCorrect={false} maxLength={64} editable={!busy&&!pending}/>{preview?<><AppText variant="card">{preview.name}</AppText>{preview.permissions.map(p=><AppText key={p}>{t(p)}</AppText>)}<AppText>{u('expires')}: {new Date(preview.expires_at).toLocaleString(locale)}</AppText><Button label={pending?t('retry'):u('accept')} loading={busy} onPress={()=>void run(true)}/></>:<Button label={u('preview')} loading={busy} disabled={!/^[a-f0-9]{64}$/.test(token.trim())} onPress={()=>void run()}/>}</>}{error&&<AppText tone="error" accessibilityRole="alert">{u('error')}</AppText>}</>}</Card>;
}
