import {useEffect,useState} from 'react';
import {useAuth} from '../../app/providers/AuthProvider';
import {useLocale} from '../../app/providers/LocaleProvider';
import {AppText} from '../../components/ui/AppText';
import {Button} from '../../components/ui/Button';
import {Card} from '../../components/ui/Card';
import {formatBusinessDate} from '../../lib/i18n/formatters';
import {useCalls} from './CallsProvider';
import {callText} from './messages';
import type {Call} from './models';
export function CallHistory({conversationId}:{conversationId:string}){
 const calls=useCalls(),{manager,state}=useAuth(),{locale}=useLocale();const owner=state.user?.id;
 const [items,setItems]=useState<Call[]>([]),[cursor,setCursor]=useState<string|null>(null),[error,setError]=useState(false),[busy,setBusy]=useState(false),[page,setPage]=useState<string|undefined>(),[attempt,setAttempt]=useState(0);
 useEffect(()=>{setItems([]);setPage(undefined);setCursor(null);},[owner,conversationId]);
 useEffect(()=>{let live=true;if(!calls||!owner)return;setBusy(true);setError(false);void manager.featureOperation(owner,t=>calls.api.list(t,{conversation_id:conversationId,cursor:page}),true).then(p=>{if(live){setItems(old=>page?[...new Map([...old,...p.items].map(c=>[c.id,c])).values()]:p.items);setCursor(p.next_cursor);}}).catch(()=>{if(live)setError(true);}).finally(()=>{if(live)setBusy(false);});return ()=>{live=false;};},[calls?.api,manager,owner,conversationId,page,calls?.call?.version,attempt]);
 if(!calls||!owner)return null;
 return <Card><AppText variant="section">{callText(locale,'history')}</AppText>{items.map(c=><Card key={c.id}><AppText>{callText(locale,c.state)}</AppText><AppText variant="caption">{formatBusinessDate(new Date(c.created_at),locale)}</AppText></Card>)}{!items.length&&!busy&&!error&&<AppText tone="muted">{callText(locale,'empty')}</AppText>}{error&&<Button label={callText(locale,'retry')} onPress={()=>{setPage(undefined);setAttempt(v=>v+1);calls.refresh();}}/>}{cursor&&<Button label={callText(locale,'more')} disabled={busy} onPress={()=>setPage(cursor)}/>}</Card>;
}
