import {CallHistory} from '../../calls/CallHistory';
import {useRealtimeRefresh} from '../../../app/providers/RealtimeProvider';
import {useMessageUnread} from '../MessageUnreadProvider';
import { formatBusinessDate } from '../../../lib/i18n/formatters';
import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, ScrollView, StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../app/navigation/routes';
import { AccountPage, useAccountRefreshControl, useAccountRefresh } from '../../accounts/components/AccountPage';
import { useAuth } from '../../../app/providers/AuthProvider';
import { useLocale } from '../../../app/providers/LocaleProvider';
import { LoadingState, RefreshError } from '../../../components/ui/Feedback';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { AppText } from '../../../components/ui/AppText';
import { ApiError, type ApiErrorCode } from '../../../lib/http/api-error';
import { JobFeedback } from '../../jobs/components/JobFeedback';
import { sessionReady, sessionOperation } from '../../jobs/state/session-ready';
import { Mutation } from '../../jobs/state/mutation';
import type { Message } from '../models';
export function ConversationScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Conversation'>) { return <AccountPage shell={{scrollable:false}} title="chat.title" back={() => navigation.goBack()} login={() => navigation.navigate('Account',{returnTo:{screen:'Conversation',params:{id:route.params.id}}})}>{owner => <Room key={`${owner}:${route.params.id}`} owner={owner} id={route.params.id} jobId={route.params.jobId} openJob={()=>{if(route.params.jobId)navigation.navigate('JobDetail',{id:route.params.jobId});}}/>}</AccountPage>; }
function Room({ owner, id, jobId, openJob }: {
    owner: string;
    id: string;
    jobId?: string;
    openJob:()=>void;
}) {
    const { manager, state: auth } = useAuth(), { t, locale } = useLocale();
    const [items, setItems] = useState<Message[]>([]), [body, setBody] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState<ApiErrorCode | null>(null), [attempt, setAttempt] = useState(0);
    const refreshControl=useAccountRefreshControl();
    const scroll=useRef<ScrollView>(null);
    const highest = useRef(0), mounted = useRef(true), focusVersion=useRef(0);
    useFocusEffect(useCallback(() => { mounted.current = true; focusVersion.current++; return () => { mounted.current = false; focusVersion.current++; }; }, []));
    const [pulling, setPulling] = useState(false), [loaded, setLoaded] = useState(false);
    const {invalidate}=useMessageUnread();
    const [mutation] = useState(() => new Mutation<Message>());
    const state = useSyncExternalStore(mutation.subscribe, mutation.getSnapshot, mutation.getSnapshot);
    const reload = () => { if (!busy && !auth.busy && !state.busy && !state.pending) { setPulling(true); setAttempt(v => v + 1); return true; } return false; };
    useAccountRefresh(pulling, reload, !busy && !auth.busy && !state.busy && !state.pending);
    useRealtimeRefresh({error,resource:{type:'conversation',id},busy:busy||state.busy||state.pending,matches:s=>s.kind==='event'&&s.event.type==='conversation.message_created.v1'&&s.event.data.conversation_id===id,refresh:()=>setAttempt(v=>v+1),revoke:()=>{setItems([]);highest.current=0;setError('NOT_FOUND');}});
    useFocusEffect(useCallback(() => {
        let active = true, loading = false;
        const refresh = async () => {
            if (loading)
                return;
            loading = true;
            setBusy(true);
            try {
                await sessionReady(manager, owner);
                let cursor: string | undefined;
                const after = highest.current, arrived: Message[] = [], seen = new Set<string>();
                do {
                    const p = await sessionOperation(manager, owner, () => manager.listMessages(owner, id, after, cursor), () => active);
                    arrived.push(...p.items);
                    cursor = p.next_cursor ?? undefined;
                    if (cursor && seen.has(cursor)) throw new ApiError('INVALID_RESPONSE');
                    if (cursor) seen.add(cursor);
                } while (cursor && active);
                if (!active)
                    return;
                setItems(old => [...new Map([...old, ...arrived].map(m => [m.id, m])).values()].sort((a, b) => a.sequence - b.sequence));
                setLoaded(true);
                highest.current = Math.max(highest.current, ...arrived.map(m => m.sequence));
                if (highest.current) {
                    const watermark = highest.current, key = randomUUID();
                    await sessionOperation(manager, owner, () => manager.readConversation(owner, id, watermark, key), () => active);
                    invalidate();
                }
                if (active) setError(null);
            }
            catch (e) {
                if (active) {
                    const code = e instanceof ApiError ? e.code : 'NETWORK';
                    setError(code);
                    if (['FORBIDDEN', 'NOT_FOUND', 'UNAUTHENTICATED'].includes(code)) {
                        setItems([]);
                        highest.current = 0;
                    }
                }
            }
            finally {
                loading = false;
                if (active) { setBusy(false); setPulling(false); }
            }
        };
        void refresh();
        const subscription = AppState.addEventListener('change', value => { if (value === 'active')
            void refresh(); });
        return () => { active = false; subscription.remove(); };
    }, [manager, owner, id, attempt, invalidate]));
    const sent = (m: Message | null) => { if (m && mounted.current) {
        setBody('');
        setItems(old => [...new Map([...old, m].map(x => [x.id, x])).values()].sort((a, b) => a.sequence - b.sequence));
        setAttempt(v => v + 1);
    } };
    const send = async () => { const text = body.trim(); if (!text)
        return; const intentFocus=focusVersion.current; const input = { client_message_id: randomUUID(), body: text, ...(jobId ? { job_id: jobId } : {}) }; sent(await mutation.run(key => sessionOperation(manager, owner, () => manager.sendMessage(owner, id, input, key), () => mounted.current&&focusVersion.current===intentFocus))); };
    const draftBlocked = (!loaded && busy) || state.busy || state.pending || error === 'NOT_FOUND' || error === 'FORBIDDEN';
    const blocked = draftBlocked;
    return <KeyboardAvoidingView style={styles.room} behavior={Platform.OS==='ios'?'padding':'height'}>
      {jobId&&<View style={styles.context}><Button variant="link" label={t('jobs.detail')} onPress={openJob}/></View>}
      <ScrollView refreshControl={refreshControl} ref={scroll} style={styles.room} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled" onContentSizeChange={()=>scroll.current?.scrollToEnd({animated:false})}>
        <RefreshError error={error} busy={busy || auth.busy || state.busy || state.pending} retry={reload}/>
        {!loaded && busy && !error && !pulling && <LoadingState message={t('accountTools.loading')}/>}
        {loaded && !items.length && !error && <AppText>{t('chat.noMessages')}</AppText>}
        <CallHistory conversationId={id}/>
        {items.map(m=><View key={m.id} style={[styles.bubble,m.sender_id===owner?styles.mine:m.sender_id===null?styles.system:styles.peer]}>
          <AppText variant="caption" tone="muted">{t(m.sender_id===null?'chat.system':m.sender_id===owner?'chat.you':'chat.peer')}</AppText>
          <AppText testID={`message-${m.id}`}>{m.body}</AppText>
          <AppText style={styles.time} tone="muted">{formatBusinessDate(new Date(m.created_at),locale)}</AppText>
        </View>)}
      </ScrollView>
      <View style={styles.composer}><Input testID="chat-body" style={{maxHeight:120}} label={t('chat.message')} value={body} multiline editable={!draftBlocked} onChangeText={setBody}/><Button testID="chat-send" label={t('chat.send')} disabled={blocked || !body.trim()} onPress={()=>void send()}/><JobFeedback error={state.error} pending={state.pending} busy={state.busy || auth.busy} retry={state.pending?()=>void mutation.run().then(sent):undefined}/></View>
    </KeyboardAvoidingView>;
}
const styles=StyleSheet.create({room:{flex:1},context:{backgroundColor:'#eff3fb',borderRadius:14,paddingHorizontal:14},messages:{gap:14,paddingVertical:16},bubble:{maxWidth:'88%',borderRadius:18,padding:14,gap:6},mine:{alignSelf:'flex-end',backgroundColor:'#eaf0fd',borderBottomRightRadius:4},peer:{alignSelf:'flex-start',backgroundColor:'#f0f3f8',borderBottomLeftRadius:4},system:{alignSelf:'center',backgroundColor:'#f4f7fc'},time:{fontSize:11,lineHeight:17},composer:{borderTopWidth:1,borderColor:'#dee5f0',paddingVertical:12,gap:8}});
