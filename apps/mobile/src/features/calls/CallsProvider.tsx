import {createContext,useContext,useEffect,useRef,useState,type PropsWithChildren} from 'react';
import {AppState,Modal,StyleSheet,View} from 'react-native';
import {randomUUID} from 'expo-crypto';
import {useAuth} from '../../app/providers/AuthProvider';
import {useLocale} from '../../app/providers/LocaleProvider';
import {useRealtime} from '../../app/providers/RealtimeProvider';
import {AppText} from '../../components/ui/AppText';
import {Button} from '../../components/ui/Button';
import {Card} from '../../components/ui/Card';
import {theme} from '../../theme/tokens';
import {ApiError} from '../../lib/http/api-error';
import {createCallsApi,type CallsApi} from './api/calls-api';
import {isActive,type Call,type CallTarget} from './models';
import {createMediaSession,prepareMicrophone} from './media';
import type {CallMediaSession,MediaStatus} from './media.types';
import {callError,callText} from './messages';
type Pending={kind:'create';job:string;target:string;key:string}|{kind:'action';call:Call;action:'accept'|'decline'|'end'|'fail';key:string};
type ContextValue={api:CallsApi;call:Call|null;busy:boolean;start:(job:string,target:string)=>Promise<void>;refresh:()=>void};
const Context=createContext<ContextValue|null>(null);
export const useCalls=()=>useContext(Context);
export function CallsProvider({children,api:provided}:PropsWithChildren<{api?:CallsApi}>){
 const {manager,state:auth}=useAuth(),{locale}=useLocale(),realtime=useRealtime();const [api]=useState(()=>provided??createCallsApi());
 const owner=auth.phase==='authenticated'&&auth.user?.status==='active'?auth.user.id:null;
 const ownerRef=useRef(owner);ownerRef.current=owner;
 const [call,setCall]=useState<Call|null>(null),[busy,setBusy]=useState(false),[pending,setPending]=useState<Pending|null>(null),[error,setError]=useState<ReturnType<typeof callError>|'microphone'|'background'|null>(null),[mediaStatus,setMediaStatus]=useState<MediaStatus|null>(null),[muted,setMuted]=useState(false),[speaker,setSpeaker]=useState(false);
 const [peerName,setPeerName]=useState<{scope:string;name:string}|null>(null);
 const peerId=call?(call.caller_id===owner?call.recipient_id:call.caller_id):null;
 const peerScope=owner&&call&&peerId?`${owner}:${call.id}:${peerId}`:null;
 const current=useRef(call);current.current=call;const media=useRef<CallMediaSession|null>(null),alive=useRef(true),operation=useRef(false),refreshRef=useRef(()=>{});
 const text=(key:Parameters<typeof callText>[1])=>callText(locale,key);
 const closeMedia=async()=>{const m=media.current;media.current=null;await m?.close().catch(()=>{});};
 const publish=(value:Call)=>{if(!alive.current)return;setCall(old=>old&&((old.id===value.id&&old.version>value.version)||(old.id!==value.id&&isActive(old)))?old:value);};
 useEffect(()=>{alive.current=true;return ()=>{alive.current=false;void closeMedia();};},[]);
 useEffect(()=>{current.current=null;setCall(null);setPeerName(null);setPending(null);setBusy(false);setError(null);setMediaStatus(null);void closeMedia();},[owner]);
 useEffect(()=>{
  if(!owner||!call||!peerId||!peerScope)return;
  let live=true;const id=call.id,scope=peerScope;
  void manager.featureOperation(owner,t=>api.targets(t,call.job_id),true).then(result=>{
   const peer=result.items.find(target=>target.user_id===peerId);
   if(live&&ownerRef.current===owner&&current.current?.id===id&&peer)setPeerName({scope,name:peer.display_name});
  }).catch(()=>{/* Keep a localized contact label if this job relationship is no longer available. */});
  return ()=>{live=false;};
 },[owner,call?.id,call?.job_id,peerId,peerScope,manager,api]);
 useEffect(()=>{
  if(!owner)return;let live=true,loading=false;
  const refresh=async()=>{
   if(!live||loading||AppState.currentState==='background')return;loading=true;
   try{
    const old=current.current;
    if(old&&isActive(old)){
     const next=await manager.featureOperation(owner,t=>api.heartbeat(t,old.id),true);
     if(live&&ownerRef.current===owner)publish(next);
    }else{
     const page=await manager.featureOperation(owner,t=>api.list(t,{active:true}),true);
     if(live&&ownerRef.current===owner&&page.items[0])publish(page.items[0]);
    }
   }catch(e){if(!live||ownerRef.current!==owner)return;const code=e instanceof ApiError?e.code:'NETWORK';if(['FORBIDDEN','NOT_FOUND','UNAUTHENTICATED'].includes(code)){await closeMedia();setCall(null);setPending(null);setError(null);} }
   finally{loading=false;}
  };
  refreshRef.current=()=>{void refresh();};void refresh();const timer=setInterval(()=>void refresh(),2500);
  const subscription=AppState.addEventListener('change',s=>{if(s==='active')void refresh();});
  const unlisten=realtime?.listen(signal=>{if(signal.kind==='sync'||signal.kind==='event'&&signal.event.type==='call.updated.v1')void refresh();});
  return ()=>{live=false;clearInterval(timer);subscription.remove();unlisten?.();};
 },[owner,manager,api,realtime]);
 useEffect(()=>{
  if(!owner||!call||call.state!=='accepted'){void closeMedia();setMediaStatus(null);return;}
  let live=true;const id=call.id;const m=createMediaSession();media.current=m;setMuted(false);setSpeaker(false);setMediaStatus(null);
  const run=async()=>{
   try{const credentials=await manager.featureOperation(owner,t=>api.media(t,id),true);if(!live||ownerRef.current!==owner)return;await m.connect(credentials,s=>{if(live&&ownerRef.current===owner)setMediaStatus(s);});}
   catch(e){if(live&&ownerRef.current===owner){setMediaStatus('failed');setError(e instanceof ApiError?callError(e.code):'microphone');}}
  };void run();return ()=>{live=false;if(media.current===m)media.current=null;void m.close().catch(()=>{});};
 },[owner,call?.id,call?.state,manager,api]);
 // Stop publishing when authorization cannot be refreshed, even while the network is down.
 useEffect(()=>{if(!owner||!call||call.state!=='accepted')return;let live=true,lastOk=Date.now();
  const timer=setInterval(()=>{void manager.featureOperation(owner,t=>api.heartbeat(t,call.id),true).then(next=>{if(live&&ownerRef.current===owner){lastOk=Date.now();publish(next);}}).catch(()=>{if(live&&Date.now()-lastOk>15000){void closeMedia();setMediaStatus('failed');}});},5000);
  return ()=>{live=false;clearInterval(timer);};
 },[owner,call?.id,call?.state,manager,api]);
 const execute=async(p:Pending)=>{
  if(!owner||operation.current||auth.busy)return;operation.current=true;setBusy(true);setError(null);
  try{
   if(p.kind==='create'||p.action==='accept'){try{await prepareMicrophone();}catch{setError('microphone');return;}}
   const result=await manager.featureOperation(owner,t=>p.kind==='create'?api.create(t,p.job,p.target,p.key):api.action(t,p.call,p.action,p.key));
   if(ownerRef.current===owner&&alive.current){publish(result);setPending(null);}
  }catch(e){if(ownerRef.current===owner){const code=e instanceof ApiError?e.code:'NETWORK';setError(callError(code));if(['NETWORK','TIMEOUT','INTERNAL','SERVICE_UNAVAILABLE','INVALID_RESPONSE'].includes(code))setPending(p);else{setPending(null);refreshRef.current();}}}
  finally{operation.current=false;if(alive.current)setBusy(false);}
 };
 useEffect(()=>{if(mediaStatus==='failed'&&call?.state==='accepted'&&owner&&!pending&&!busy)void execute({kind:'action',call,action:'fail',key:randomUUID()});},[mediaStatus,call?.id,call?.state,owner]);
 const act=(action:'accept'|'decline'|'end'|'fail')=>{if(!call)return;const p:Pending={kind:'action',call,action,key:randomUUID()};if(action==='end'||action==='fail')void closeMedia();void execute(p);};
 const value:ContextValue={api,call,busy:busy||!!pending,start:async(job,target)=>{await execute({kind:'create',job,target,key:randomUUID()});},refresh:()=>refreshRef.current()};
 const toggle=async(kind:'mute'|'speaker')=>{const m=media.current;if(!m)return;try{if(kind==='mute'){await m.mute(!muted);setMuted(!muted);}else{await m.speaker(!speaker);setSpeaker(!speaker);}}catch{setError('microphone');}};
 const show=!!owner&&(!!call||!!error||!!pending);
 return <Context.Provider value={value}>{children}<Modal visible={show} transparent animationType="fade" onRequestClose={()=>{if(call&&isActive(call))act('end');else{setCall(null);setError(null);setPending(null);}}}><View style={styles.shade}><View style={styles.panel}><AppText variant="title" accessibilityRole="header">{call?.state==='ringing'?text(call.recipient_id===owner?'incoming':'outgoing'):text('title')}</AppText><AppText tone="muted">{text('hint')}</AppText>{call&&<><AppText testID="call-state">{text(call.state==='accepted'?(mediaStatus==='connected'?'connected':mediaStatus==='reconnecting'?'reconnecting':mediaStatus==='failed'?'failed':'accepted'):call.state)}</AppText><AppText variant="caption">{text(call.caller_id===owner?'to':'from')}: {peerName?.scope===peerScope?peerName.name:text('peer')}</AppText></>}{error&&<AppText tone="error" accessibilityRole="alert">{text(error)}</AppText>}{call?.state==='ringing'&&call.recipient_id===owner&&<><Button testID="call-accept" label={text('accept')} disabled={busy||auth.busy||!!pending} onPress={()=>act('accept')}/><Button testID="call-decline" label={text('decline')} variant="secondary" disabled={busy||auth.busy||!!pending} onPress={()=>act('decline')}/></>}{call?.state==='accepted'&&mediaStatus==='connected'&&<><Button testID="call-mute" label={text(muted?'unmute':'mute')} variant="secondary" onPress={()=>void toggle('mute')}/>{media.current?.supportsSpeaker&&<Button testID="call-speaker" label={text(speaker?'earpiece':'speaker')} variant="secondary" onPress={()=>void toggle('speaker')}/>}</>}{mediaStatus==='audioError'&&<Button label={text('resumeAudio')} onPress={()=>void media.current?.resume().then(()=>setMediaStatus('connected')).catch(()=>setError('microphone'))}/>} {call&&isActive(call)&&<Button testID="call-end" label={text('end')} disabled={busy||auth.busy} onPress={()=>act('end')}/>} {pending&&<Button testID="call-retry" label={text('retry')} disabled={busy||auth.busy} onPress={()=>void execute(pending)}/>} {(!call||!isActive(call))&&!pending&&<Button testID="call-close" label={text('close')} variant="secondary" onPress={()=>{setCall(null);setError(null);}}/>}</View></View></Modal></Context.Provider>;
}
export function CallButton({jobId}:{jobId:string}){
 const calls=useCalls(),{manager,state}=useAuth(),{locale}=useLocale();const owner=state.user?.id;const [targets,setTargets]=useState<CallTarget[]>([]),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let live=true;setTargets([]);setError(false);if(!owner||!calls)return;void manager.featureOperation(owner,t=>calls.api.targets(t,jobId),true).then(p=>{if(live)setTargets(p.items);}).catch(e=>{if(live&&!(e instanceof ApiError&&e.code==='NOT_FOUND'))setError(true);});return ()=>{live=false;};},[owner,manager,calls?.api,jobId,attempt]);
 if(!calls||!owner)return null;
 return <Card>{targets.map(target=><Button key={`${target.user_id}:${target.role}`} label={`${callText(locale,target.role)} · ${target.display_name}`} testID={`call-target-${target.role}`} disabled={calls.busy||state.busy||!!calls.call&&isActive(calls.call)} onPress={()=>void calls.start(jobId,target.user_id)}/>)}{!targets.length&&!error&&<AppText tone="muted">{callText(locale,'noTargets')}</AppText>}{error&&<Button label={callText(locale,'retry')} onPress={()=>setAttempt(v=>v+1)}/>}</Card>;
}
const styles=StyleSheet.create({shade:{flex:1,backgroundColor:'#162b25b3',justifyContent:'center',alignItems:'center',padding:24},panel:{width:'100%',maxWidth:440,gap:16,padding:24,borderRadius:theme.radius.panel,backgroundColor:theme.colors.surface}});
