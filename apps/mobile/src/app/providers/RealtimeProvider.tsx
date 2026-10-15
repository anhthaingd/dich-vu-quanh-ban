import {createContext,useCallback,useContext,useEffect,useRef,type PropsWithChildren} from 'react';
import {AppState} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {RealtimeClient,type Resource,type Signal} from '../../lib/realtime/realtime-client';
import {useAuth} from './AuthProvider';
const Context=createContext<RealtimeClient|null>(null);
export const useRealtime=()=>useContext(Context);
export function RealtimeProvider({children}:PropsWithChildren){
 const {manager}=useAuth();
 const client=useRef<RealtimeClient|null>(null);
 if(!client.current)client.current=new RealtimeClient(process.env.EXPO_PUBLIC_API_URL,process.env.EXPO_PUBLIC_REALTIME_ENABLED==='1');
 useEffect(()=>{
  const c=client.current!,unbind=manager.bindRealtime(c);
  c.setForeground(AppState.currentState!=='background');
  const sub=AppState.addEventListener('change',value=>c.setForeground(value==='active'));
  return ()=>{sub.remove();unbind();c.dispose();};
 },[manager]);
 return <Context.Provider value={client.current}>{children}</Context.Provider>;
}
// Coalesce invalidations while HTTP/form mutations are busy; an event during a fetch remains dirty.
// Each screen still owns its HTTP snapshot, version checks and draft state.
export function useRealtimeRefresh(options:{resource?:Resource;matches:(s:Signal)=>boolean;busy:boolean;error?:string|null;refresh:()=>void;revoke?:()=>void}){
 const client=useRealtime(),{manager}=useAuth(),latest=useRef(options);latest.current=options;
 const type=options.resource?.type,id=options.resource?.id;
 useFocusEffect(useCallback(()=>{
  if(!client)return;
  let dirty=false,last=Date.now(),failures=0,previousError:string|null|undefined;
  const unlisten=client.listen(signal=>{
   const o=latest.current;
   if(signal.kind==='revoked'&&signal.resource.type===type&&signal.resource.id===id){o.revoke?.();dirty=true;}
   else if(signal.kind==='sync'||o.matches(signal))dirty=true;
  });
  const unwatch=type&&id?client.watch({type,id}):()=>{};
  const timer=setInterval(()=>{
   const error=latest.current.error;
   if(error&&error!==previousError&&['NETWORK','SERVICE_UNAVAILABLE','TIMEOUT'].includes(error))failures=Math.min(4,failures+1);
   if(!error&&!latest.current.busy)failures=0;previousError=error;
   if(AppState.currentState==='background'||failures&&Date.now()-last<Math.min(120000,15000*2**failures))return;
   if(Date.now()-last>=(client.connected?60000:15000))dirty=true;
   if(dirty&&!latest.current.busy&&!manager.getSnapshot().busy){dirty=false;last=Date.now();latest.current.refresh();}
  },100);
  return ()=>{unlisten();unwatch();clearInterval(timer);};
 },[client,manager,type,id]));
}
