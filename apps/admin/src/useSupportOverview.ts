import {useEffect,useRef,useState} from 'react';
import type {TeamRequest} from './useAdminTeam';
export type SupportRange={from:string;to:string};
const range=(days:number)=>({from:new Date(Date.now()-days*86400000).toISOString(),to:new Date().toISOString()});
export const supportStates=['open','reviewing','awaiting_evidence','resolved','closed'];
export function useSupportOverview(request:TeamRequest,fail:(e:unknown)=>void){
 const [days,setDays]=useState(7),[period,setPeriod]=useState(()=>range(7)),[counts,setCounts]=useState<Record<string,string>|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(false),generation=useRef(0);
 useEffect(()=>{const gen=++generation.current;setBusy(true);setError(false);setCounts(null);void request('/admin/reports-summary?'+new URLSearchParams(period)).then(v=>{const r=v as {counts?:Record<string,unknown>};if(!r?.counts||!supportStates.every(s=>typeof r.counts![s]==='string'&&/^\d+$/.test(r.counts![s] as string)))throw {code:'INVALID_RESPONSE'};if(gen===generation.current)setCounts(r.counts as Record<string,string>);}).catch(e=>{if(gen===generation.current){setError(true);fail(e);}}).finally(()=>{if(gen===generation.current)setBusy(false);});return()=>{generation.current++;};},[period,request]);
 return {days,period,counts,busy,error,change:(d:number)=>{setDays(d);setPeriod(range(d));},refresh:()=>setPeriod(range(days))};
}
