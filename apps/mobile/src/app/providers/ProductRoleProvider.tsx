import {AppState} from 'react-native';
import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type PropsWithChildren} from 'react';
import {useAuth} from './AuthProvider';
import type {MyMembership} from '../../features/organizations/models';
import {sessionOperation} from '../../features/jobs/state/session-ready';
import {ApiError} from '../../lib/http/api-error';
type Selection={owner:string;membership:MyMembership};
type Role={available:boolean;membership:MyMembership|null;choose:(id:string|null)=>Promise<void>;refresh:()=>Promise<void>};
const fallback:Role={available:false,membership:null,choose:async()=>{},refresh:async()=>{}};
const Context=createContext<Role>(fallback);
export function ProductRoleProvider({children}:PropsWithChildren){
 const {manager,state}=useAuth(),owner=state.phase==='authenticated'?state.user?.id:undefined;
 const [selection,setSelection]=useState<Selection|null>(null),generation=useRef(0),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;generation.current++;};},[]);
 useEffect(()=>{generation.current++;setSelection(null);},[owner]);
 const membership=selection?.owner===owner?selection?.membership??null:null;
 const choose=useCallback(async(id:string|null)=>{
  const epoch=++generation.current;
  if(!id){setSelection(null);return;}
  if(!owner)throw new ApiError('UNAUTHENTICATED');
  const active=()=>alive.current&&generation.current===epoch&&manager.getSnapshot().user?.id===owner;
  const seen=new Set<string>();let cursor:string|undefined;let found:MyMembership|undefined;
  do {const page=await sessionOperation(manager,owner,()=>manager.myMemberships(owner,cursor),active);found=page.items.find(m=>m.partner_id===id&&m.active);cursor=page.next_cursor??undefined;if(cursor&&seen.has(cursor))throw new ApiError('INVALID_RESPONSE');if(cursor)seen.add(cursor);}while(!found&&cursor&&active());
  if(!active())throw new ApiError('CANCELLED');
  if(!found){setSelection(null);throw new ApiError('FORBIDDEN');}
  setSelection({owner,membership:found});
 },[manager,owner]);
 const refresh=useCallback(async()=>{if(!membership)return;try{await choose(membership.partner_id);}catch(e){if(e instanceof ApiError&&['FORBIDDEN','NOT_FOUND','UNAUTHENTICATED'].includes(e.code))setSelection(null);}},[choose,membership?.partner_id]);
 useEffect(()=>{const sub=AppState.addEventListener('change',phase=>{if(phase==='active')void refresh();});return()=>sub.remove();},[refresh]);
 const value=useMemo(()=>({available:true,membership,choose,refresh}),[membership,choose,refresh]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useProductRole=()=>useContext(Context);
