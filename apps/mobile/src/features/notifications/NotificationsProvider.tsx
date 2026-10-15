import {useRealtime} from '../../app/providers/RealtimeProvider';
import {randomUUID} from 'expo-crypto';
import {createContext,useCallback,useContext,useEffect,useRef,useState,type PropsWithChildren} from 'react';
import {AppState} from 'react-native';
import {useAuth} from '../../app/providers/AuthProvider';
import {ApiError,type ApiErrorCode} from '../../lib/http/api-error';
import type {Notice} from './api/notifications-api';
type Inbox={items:Notice[];loading:boolean;loaded:boolean;error:ApiErrorCode|null;refresh:()=>Promise<void>;markRead:(ids:string[])=>Promise<void>};
const Context=createContext<Inbox>({items:[],loading:false,loaded:false,error:null,refresh:async()=>{},markRead:async()=>{}});
export const useNotifications=()=>useContext(Context);
export function NotificationsProvider({children}:PropsWithChildren){
  const realtime=useRealtime();
  const {manager,state}=useAuth(),owner=state.phase==='authenticated'?state.user?.id:undefined;
  const [data,setData]=useState<{owner?:string;items:Notice[];loading:boolean;loaded:boolean;error:ApiErrorCode|null}>({items:[],loading:false,loaded:false,error:null});
  const current=useRef(owner),running=useRef(false),last=useRef(0),dirty=useRef(false),generation=useRef(0),failures=useRef(0);current.current=owner;
  const refresh=useCallback(async()=>{
    if(!owner||running.current||manager.getSnapshot().busy)return;
    const epoch=generation.current;dirty.current=false;running.current=true;setData(d=>({...d,owner,loading:true,error:d.owner===owner?d.error:null,loaded:d.owner===owner?d.loaded:false,items:d.owner===owner?d.items:[]}));
    try{let cursor:string|undefined;const found=new Map<string,Notice>(),seen=new Set<string>();
      do{const page=await manager.listNotifications(owner,cursor);if(current.current!==owner||epoch!==generation.current)return;
        page.items.filter(n=>!n.kind.startsWith('conversation.')).forEach(n=>found.set(n.id,n));cursor=page.next_cursor??undefined;
        if(cursor&&seen.has(cursor))throw new ApiError('INVALID_RESPONSE');if(cursor)seen.add(cursor);
      }while(cursor);
      if(current.current===owner&&epoch===generation.current){setData(previous=>({owner,items:[...found.values()].map(n=>({...n,read_at:n.read_at??(previous.owner===owner?previous.items.find(x=>x.id===n.id)?.read_at:null)??null})),loading:false,loaded:true,error:null}));last.current=Date.now();failures.current=0;}
    }catch(e){if(current.current===owner&&epoch===generation.current){const code=e instanceof ApiError?e.code:'NETWORK';setData(d=>({...d,loading:false,error:code,items:['FORBIDDEN','NOT_FOUND','UNAUTHENTICATED'].includes(code)?[]:d.items}));last.current=Date.now();failures.current=Math.min(4,failures.current+1);}}
    finally{running.current=false;}
  },[manager,owner]);
  useEffect(()=>{generation.current++;last.current=0;failures.current=0;dirty.current=true;
    const unlisten=realtime?.listen(signal=>{if(signal.kind==='sync'||signal.kind==='event'&&signal.event.type.startsWith('notification.'))dirty.current=true;});
    const timer=setInterval(()=>{if(AppState.currentState!=='background'&&Date.now()-last.current>=(failures.current?Math.min(120000,15000*2**failures.current):0)&&(dirty.current||Date.now()-last.current>=(realtime?.connected?60000:15000)))void refresh();},250);
    return()=>{generation.current++;unlisten?.();clearInterval(timer);};},[refresh,realtime]);
  // Stable per-notification UUIDs are retained on an uncertain result.
  const keys=useRef(new Map<string,string>());
  const markRead=useCallback(async(ids:string[])=>{
    if(!owner)throw new ApiError('UNAUTHENTICATED');
    const epoch=generation.current;
    for(const id of ids){const scope=owner+':'+id;let key=keys.current.get(scope);if(!key){key=randomUUID();keys.current.set(scope,key);}
      await manager.readNotification(owner,id,key);if(current.current!==owner||epoch!==generation.current)return;
      setData(d=>d.owner===owner?{...d,items:d.items.map(n=>n.id===id?{...n,read_at:n.read_at??new Date().toISOString()}:n)}:d);
    }
  },[manager,owner]);
  const visible=data.owner===owner&&owner?data:{items:[],loading:false,loaded:false,error:null};
  return <Context.Provider value={{items:visible.items,loading:visible.loading,loaded:visible.loaded,error:visible.error,refresh,markRead}}>{children}</Context.Provider>;
}
