import {financeText} from '../../finance/messages';
import {useCallback,useState,useSyncExternalStore} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../../app/navigation/routes';
import {useAuth} from '../../../app/providers/AuthProvider';
import {useLocale} from '../../../app/providers/LocaleProvider';
import {AccountPage} from '../../accounts/components/AccountPage';
import {AppText} from '../../../components/ui/AppText';
import {Card} from '../../../components/ui/Card';
import {Input} from '../../../components/ui/Input';
import {Button} from '../../../components/ui/Button';
import {ApiError,type ApiErrorCode} from '../../../lib/http/api-error';
import {Mutation} from '../../jobs/state/mutation';
import {sessionReady} from '../../jobs/state/session-ready';
import {TeamFeedback} from './TeamFeedback';
import type {MyMembership,Departure} from '../models';
export function OrganizationsScreen({navigation}:NativeStackScreenProps<RootStackParamList,'Organizations'>){return <AccountPage title="team.title" back={()=>navigation.goBack()} login={()=>navigation.navigate('Account',{returnTo:'Organizations'})}>{owner=><Memberships key={owner} owner={owner} open={id=>navigation.navigate('Team',{id})} verify={()=>navigation.navigate('VerifyContact')} wallet={id=>navigation.navigate('Finance',{id})}/>}</AccountPage>;}
function Memberships({owner,open,verify,wallet}:{owner:string;open:(id:string)=>void;verify:()=>void;wallet:(id:string)=>void}){
 const {manager,state:auth}=useAuth(),{t,locale}=useLocale();
 const [items,setItems]=useState<MyMembership[]>([]),[token,setToken]=useState(''),[reason,setReason]=useState(''),[departure,setDeparture]=useState<{id:string;preview:Departure}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<ApiErrorCode|null>(null),[loaded,setLoaded]=useState(false);
 const [mutation]=useState(()=>new Mutation<unknown>()),state=useSyncExternalStore(mutation.subscribe,mutation.getSnapshot,mutation.getSnapshot);
 const load=useCallback(async()=>{setBusy(true);setError(null);try{await sessionReady(manager,owner);const all:MyMembership[]=[];let cursor:string|undefined;do{const page=await manager.myMemberships(owner,cursor);all.push(...page.items);cursor=page.next_cursor??undefined;}while(cursor);setItems(all);setLoaded(true);}catch(e){setError(e instanceof ApiError?e.code:'NETWORK');}finally{setBusy(false);}},[manager,owner]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 const run=async(work?:(key:string)=>Promise<unknown>)=>{if(await mutation.run(work)){setToken('');setDeparture(null);setReason('');await load();await manager.loadProfile(owner);}};
 const preview=async(id:string)=>{setBusy(true);setError(null);try{const p=await manager.departurePreview(owner,id);setDeparture({id,preview:p});setReason('');}catch(e){setError(e instanceof ApiError?e.code:'NETWORK');}finally{setBusy(false);}};
 const disabled=busy||auth.busy||state.busy||state.pending;
 return <><AppText tone="muted">{t('team.intro')}</AppText><Button label={t('team.verifyTitle')} disabled={disabled} onPress={verify}/>
 <Card><AppText variant="section">{t('team.acceptTitle')}</AppText><Input testID="team-token" label={t('team.token')} hint={t('team.tokenHint')} value={token} onChangeText={setToken} editable={!disabled} secureTextEntry autoCapitalize="none" autoCorrect={false}/><Button testID="team-accept" label={t('team.accept')} disabled={disabled||!/^[a-f0-9]{64}$/.test(token)} onPress={()=>void run(k=>manager.acceptInvitation(owner,token,k))}/></Card>
 <TeamFeedback error={error??state.error}/>{state.pending&&<Button label={t('common.retry')} disabled={busy||auth.busy||state.busy} onPress={()=>void run()}/>}
 <Button testID="memberships-reload" label={t('accountTools.reload')} disabled={disabled} onPress={()=>void load()}/>{busy&&<AppText>{t('accountTools.loading')}</AppText>}
 {loaded&&!items.length&&<AppText>{t('team.empty')}</AppText>}
 {items.map(m=><Card key={m.id}><AppText variant="section">{m.partner_name}</AppText><AppText>{t(m.active?'team.active':'team.left')}</AppText><AppText>{t(m.is_owner?'team.owner':'team.worker')}</AppText>{m.active&&m.partner_kind!=='solo'&&(m.is_owner||m.permissions.includes('members.manage'))&&<Button testID={'team-open-'+m.partner_id} label={t('team.manage')} disabled={disabled} onPress={()=>open(m.partner_id)}/>}{m.active&&(m.is_owner||m.permissions.includes('wallet.read'))&&<Button testID={'membership-wallet-'+m.partner_id} label={financeText(locale,'wallet')} disabled={disabled} onPress={()=>wallet(m.partner_id)}/>} {m.active&&!m.is_owner&&<Button testID={'team-leave-'+m.id} label={t('team.leave')} variant="secondary" disabled={disabled} onPress={()=>void preview(m.id)}/>}</Card>)}
 {departure&&<Card><AppText variant="section">{t('team.previewTitle')}</AppText><AppText>{t('team.handover',{count:departure.preview.total})}</AppText><AppText>{t('team.handoverHint')}</AppText><Input testID="team-leave-reason" label={t('team.reason')} value={reason} onChangeText={setReason} editable={!disabled}/><Button testID="team-leave-confirm" label={t('team.confirmLeave')} disabled={disabled||!reason.trim()} onPress={()=>void run(k=>manager.leaveTeam(owner,departure.id,departure.preview.membership_version,reason,k))}/><Button label={t('team.cancel')} variant="secondary" disabled={disabled} onPress={()=>setDeparture(null)}/></Card>}
 </>;
}
