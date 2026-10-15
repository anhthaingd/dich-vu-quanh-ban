import {useRealtimeRefresh} from '../../../app/providers/RealtimeProvider';
import {useMessageUnread} from '../MessageUnreadProvider';
import { formatBusinessDate } from '../../../lib/i18n/formatters';
import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../app/navigation/routes';
import { AccountPage } from '../../accounts/components/AccountPage';
import { useAuth } from '../../../app/providers/AuthProvider';
import { useLocale } from '../../../app/providers/LocaleProvider';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { AppText } from '../../../components/ui/AppText';
import { ApiError, type ApiErrorCode } from '../../../lib/http/api-error';
import { JobFeedback } from '../../jobs/components/JobFeedback';
import { sessionReady } from '../../jobs/state/session-ready';
import { Mutation } from '../../jobs/state/mutation';
import type { Message } from '../models';
export function ConversationScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Conversation'>) { return <AccountPage title="chat.title" back={() => navigation.goBack()} login={() => navigation.navigate('Account')}>{owner => <Room key={`${owner}:${route.params.id}`} owner={owner} id={route.params.id} jobId={route.params.jobId}/>}</AccountPage>; }
function Room({ owner, id, jobId }: {
    owner: string;
    id: string;
    jobId?: string;
}) {
    const { manager, state: auth } = useAuth(), { t, locale } = useLocale();
    const [items, setItems] = useState<Message[]>([]), [body, setBody] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState<ApiErrorCode | null>(null), [attempt, setAttempt] = useState(0);
    const highest = useRef(0);
    const {invalidate}=useMessageUnread();
    const [mutation] = useState(() => new Mutation<Message>());
    const state = useSyncExternalStore(mutation.subscribe, mutation.getSnapshot, mutation.getSnapshot);
    useRealtimeRefresh({error,resource:{type:'conversation',id},busy:busy||state.busy||state.pending,matches:s=>s.kind==='event'&&s.event.type==='conversation.message_created.v1'&&s.event.data.conversation_id===id,refresh:()=>setAttempt(v=>v+1),revoke:()=>{setItems([]);highest.current=0;setError('NOT_FOUND');}});
    useFocusEffect(useCallback(() => {
        let active = true, loading = false;
        const refresh = async () => {
            if (loading)
                return;
            loading = true;
            setBusy(true);
            setError(null);
            try {
                await sessionReady(manager, owner);
                let cursor: string | undefined;
                const after = highest.current, arrived: Message[] = [];
                do {
                    const p = await manager.listMessages(owner, id, after, cursor);
                    arrived.push(...p.items);
                    cursor = p.next_cursor ?? undefined;
                } while (cursor && active);
                if (!active)
                    return;
                setItems(old => [...new Map([...old, ...arrived].map(m => [m.id, m])).values()].sort((a, b) => a.sequence - b.sequence));
                highest.current = Math.max(highest.current, ...arrived.map(m => m.sequence));
                if (highest.current) {
                    await manager.readConversation(owner, id, highest.current, randomUUID());
                    invalidate();
                }
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
                if (active)
                    setBusy(false);
            }
        };
        void refresh();
        const subscription = AppState.addEventListener('change', value => { if (value === 'active')
            void refresh(); });
        return () => { active = false; subscription.remove(); };
    }, [manager, owner, id, attempt, invalidate]));
    const sent = (m: Message | null) => { if (m) {
        setBody('');
        setItems(old => [...new Map([...old, m].map(x => [x.id, x])).values()].sort((a, b) => a.sequence - b.sequence));
        setAttempt(v => v + 1);
    } };
    const send = async () => { const text = body.trim(); if (!text)
        return; const input = { client_message_id: randomUUID(), body: text, ...(jobId ? { job_id: jobId } : {}) }; sent(await mutation.run(key => manager.sendMessage(owner, id, input, key))); };
    const blocked = busy || auth.busy || state.busy || state.pending || error === 'NOT_FOUND' || error === 'FORBIDDEN';
    return <><AppText tone="muted">{t('chat.refreshHint')}</AppText><Button testID="chat-reload" label={t('chat.reload')} disabled={busy || auth.busy || state.busy} onPress={() => setAttempt(v => v + 1)}/><JobFeedback error={error}/>{busy && <AppText>{t('accountTools.loading')}</AppText>}{!busy && !items.length && !error && <AppText>{t('chat.noMessages')}</AppText>}{items.map(m => <Card key={m.id}><AppText variant="caption">{t(m.sender_id === null ? 'chat.system' : m.sender_id === owner ? 'chat.you' : 'chat.peer')}</AppText><AppText testID={`message-${m.id}`}>{m.body}</AppText><AppText variant="caption" tone="muted">{formatBusinessDate(new Date(m.created_at), locale)}</AppText></Card>)}<Card><Input testID="chat-body" label={t('chat.message')} value={body} multiline editable={!blocked} onChangeText={setBody}/><Button testID="chat-send" label={t('chat.send')} disabled={blocked || !body.trim()} onPress={() => void send()}/><JobFeedback error={state.error} pending={state.pending} busy={state.busy || auth.busy} retry={state.pending ? () => void mutation.run().then(sent) : undefined}/></Card></>;
}
