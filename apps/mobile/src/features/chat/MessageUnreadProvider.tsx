import {createContext,useCallback,useContext,useEffect,useRef,useState,type PropsWithChildren} from 'react';
import {AppState} from 'react-native';
import {useAuth} from '../../app/providers/AuthProvider';
import {useRealtime} from '../../app/providers/RealtimeProvider';
import {ApiError} from '../../lib/http/api-error';

const Context=createContext({unread:0,invalidate:()=>{}});
export const useMessageUnread=()=>useContext(Context);

// HTTP is authoritative. Events only invalidate, so duplicate/reordered frames cannot add badges.
export function MessageUnreadProvider({children}:PropsWithChildren){
  const {manager,state}=useAuth(),realtime=useRealtime();
  const owner=state.phase==='authenticated'&&state.user?.status==='active'?state.user.id:undefined;
  const [data,setData]=useState<{owner?:string;unread:number}>({unread:0});
  const current=useRef(owner),generation=useRef(0),running=useRef(false),dirty=useRef(true),last=useRef(0),failures=useRef(0),invalidations=useRef(0);
  current.current=owner;
  const invalidate=useCallback(()=>{invalidations.current++;dirty.current=true;failures.current=0;},[]);
  useEffect(()=>{
    const epoch=++generation.current;dirty.current=true;last.current=0;failures.current=0;setData({owner,unread:0});
    const refresh=async()=>{
      if(!owner||running.current||manager.getSnapshot().busy)return;
      running.current=true;dirty.current=false;const invalidation=invalidations.current;
      try{
        let cursor:string|undefined;const found=new Map<string,number>(),seen=new Set<string>();
        do{
          const page=await manager.unreadConversations(owner,cursor);
          if(current.current!==owner||generation.current!==epoch)return;
          page.items.forEach(c=>found.set(c.id,c.unread));cursor=page.next_cursor??undefined;
          if(cursor&&seen.has(cursor))throw new ApiError('INVALID_RESPONSE');
          if(cursor)seen.add(cursor);
        }while(cursor);
        setData({owner,unread:[...found.values()].reduce((sum,n)=>sum+n,0)});failures.current=0;
      }catch(e){
        if(current.current!==owner||generation.current!==epoch)return;
        if(e instanceof ApiError&&['UNAUTHENTICATED','FORBIDDEN','NOT_FOUND'].includes(e.code))setData({owner,unread:0});
        // A new message/reconnect/read is fresh evidence to reconcile now. A
        // failed request started before that signal must not restore its delay.
        failures.current=invalidations.current===invalidation?Math.min(4,failures.current+1):0;dirty.current=true;
      }finally{running.current=false;if(generation.current===epoch)last.current=Date.now();}
    };
    const unlisten=realtime?.listen(s=>{if(s.kind==='sync'||s.kind==='revoked'||s.kind==='event'&&s.event.type.startsWith('conversation.'))invalidate();});
    const foreground=AppState.addEventListener('change',s=>{if(s==='active')invalidate();});
    const timer=setInterval(()=>{
      if(AppState.currentState==='background')return;
      const elapsed=Date.now()-last.current;
      if(failures.current&&elapsed<Math.min(120000,15000*2**failures.current))return;
      if(dirty.current||elapsed>=(realtime?.connected?60000:15000))void refresh();
    },250);
    return()=>{generation.current++;unlisten?.();foreground.remove();clearInterval(timer);};
  },[owner,manager,realtime,invalidate]);
  return <Context.Provider value={{unread:owner&&data.owner===owner?data.unread:0,invalidate}}>{children}</Context.Provider>;
}
