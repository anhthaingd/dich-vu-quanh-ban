import {useRealtimeRefresh} from '../../../app/providers/RealtimeProvider';
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../app/navigation/routes';
import { AccountPage, useAccountRefresh } from '../../accounts/components/AccountPage';
import { useAuth } from '../../../app/providers/AuthProvider';
import { useLocale } from '../../../app/providers/LocaleProvider';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { AppText } from '../../../components/ui/AppText';
import { ApiError, type ApiErrorCode } from '../../../lib/http/api-error';
import { LoadingState, RefreshError } from '../../../components/ui/Feedback';
import { sessionReady, sessionOperation } from '../../jobs/state/session-ready';
import type { Conversation } from '../models';
export function ConversationsScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Conversations'>) { return <AccountPage shell={{onWallet:id=>navigation.navigate('Finance',{id}), activeTab: 'messages', onAccount: () => navigation.navigate('Account'), onCatalog: () => navigation.popTo('CatalogHome'), onJobs: () => navigation.navigate('Jobs'), onNotifications: () => navigation.navigate('Notifications'), onMessages: () => navigation.navigate('Conversations') }} title="chat.title" back={() => navigation.goBack()} login={() => navigation.navigate('Account', { returnTo: route.params?.jobId?{screen:'Conversations',params:{jobId:route.params.jobId}}:'Conversations' })}>{owner => <List key={`${owner}:${route.params?.jobId ?? ''}`} owner={owner} jobId={route.params?.jobId} open={id => navigation.navigate('Conversation', { id, jobId: route.params?.jobId })}/>}</AccountPage>; }
function List({ owner, jobId, open }: {
    owner: string;
    jobId?: string;
    open: (id: string) => void;
}) {
    const { manager, state: auth } = useAuth(), { t } = useLocale();
    const [items, setItems] = useState<Conversation[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState<ApiErrorCode | null>(null), [attempt, setAttempt] = useState(0), [next, setNext] = useState<string | null>(null);
    const [pulling, setPulling] = useState(false), [loaded, setLoaded] = useState(false);
    const generation = useRef(0), pageCount = useRef(1);
    const reload = () => { if (!busy && !auth.busy) { setPulling(true); setAttempt(v => v + 1); return true; } return false; };
    useAccountRefresh(pulling, reload, !busy && !auth.busy);
    useRealtimeRefresh({error,busy,matches:s=>s.kind==='event'&&s.event.type.startsWith('conversation.'),refresh:()=>setAttempt(v=>v+1),revoke:()=>setItems([])});
    useFocusEffect(useCallback(() => {
        const epoch = ++generation.current; let active = true;
        setBusy(true);
        void (async () => {
            await sessionReady(manager, owner);
            const found = new Map<string, Conversation>(), seen = new Set<string>();
            let cursor: string | undefined, pages = 0;
            do {
                const p = await sessionOperation(manager,owner,()=>manager.listConversations(owner,cursor),()=>active);
                if (!active) return;
                p.items.forEach(c => found.set(c.id, c)); pages++;
                cursor = p.next_cursor ?? undefined;
                if (cursor && seen.has(cursor)) throw new ApiError('INVALID_RESPONSE');
                if (cursor) seen.add(cursor);
            } while (cursor && pages < pageCount.current);
            setItems([...found.values()]); setNext(cursor ?? null); setError(null); setLoaded(true);
        })().catch(e => {
            if (!active) return;
            const code = e instanceof ApiError ? e.code : 'NETWORK'; setError(code);
            if (['FORBIDDEN', 'NOT_FOUND', 'UNAUTHENTICATED'].includes(code)) { setItems([]); setNext(null); }
        }).finally(() => { if (active && epoch === generation.current) { setBusy(false); setPulling(false); } });
        return () => { active = false; generation.current++; };
    }, [manager, owner, attempt]));
    const more = async () => {
        if (!next || busy || auth.busy) return;
        const epoch = generation.current; setBusy(true);
        try {
            const p = await manager.listConversations(owner, next);
            if (epoch !== generation.current) return;
            setItems(v => [...new Map([...v, ...p.items].map(c => [c.id, c])).values()]);
            setNext(p.next_cursor); pageCount.current++; setError(null);
        } catch (e) {
            if (epoch !== generation.current) return;
            const code = e instanceof ApiError ? e.code : 'NETWORK'; setError(code);
            if (['FORBIDDEN', 'NOT_FOUND', 'UNAUTHENTICATED'].includes(code)) { setItems([]); setNext(null); }
        } finally { if (epoch === generation.current) setBusy(false); }
    };
    const shown = items.filter(c => !jobId || c.job_ids.includes(jobId));
    return <><AppText tone="muted">{t('chat.intro')}</AppText><RefreshError error={error} busy={busy || auth.busy} retry={reload}/>{!loaded && busy && !error && !pulling && <LoadingState message={t('accountTools.loading')}/>}{loaded && !error && !shown.length && <AppText>{t('chat.empty')}</AppText>}{shown.map(c => <Card key={c.id}><AppText variant="section">{c.display_name}</AppText><AppText>{t(c.kind === 'direct' ? 'chat.private' : 'chat.partner')}</AppText><AppText>{t('chat.unread', { count: c.unread })}</AppText><Button testID={`conversation-open-${c.id}`} label={t('chat.open')} onPress={() => open(c.id)}/></Card>)}{next && <Button label={t('accountTools.more')} disabled={busy || auth.busy} onPress={() => void more()}/>}</>;
}
