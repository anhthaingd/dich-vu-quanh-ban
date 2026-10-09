import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../app/navigation/routes';
import { AccountPage } from '../../accounts/components/AccountPage';
import { useAuth } from '../../../app/providers/AuthProvider';
import { useLocale } from '../../../app/providers/LocaleProvider';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { AppText } from '../../../components/ui/AppText';
import { ApiError, type ApiErrorCode } from '../../../lib/http/api-error';
import { JobFeedback } from '../../jobs/components/JobFeedback';
import { sessionReady } from '../../jobs/state/session-ready';
import type { Conversation } from '../models';
export function ConversationsScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Conversations'>) { return <AccountPage shell={{ activeTab: 'messages', onAccount: () => navigation.navigate('Account'), onCatalog: () => navigation.popTo('CatalogHome'), onJobs: () => navigation.navigate('Jobs'), onMessages: () => navigation.navigate('Conversations') }} title="chat.title" back={() => navigation.goBack()} login={() => navigation.navigate('Account', { returnTo: 'Conversations' })}>{owner => <List key={`${owner}:${route.params?.jobId ?? ''}`} owner={owner} jobId={route.params?.jobId} open={id => navigation.navigate('Conversation', { id, jobId: route.params?.jobId })}/>}</AccountPage>; }
function List({ owner, jobId, open }: {
    owner: string;
    jobId?: string;
    open: (id: string) => void;
}) {
    const { manager, state: auth } = useAuth(), { t } = useLocale();
    const [items, setItems] = useState<Conversation[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState<ApiErrorCode | null>(null), [attempt, setAttempt] = useState(0), [next, setNext] = useState<string | null>(null);
    useFocusEffect(useCallback(() => { let active = true; setBusy(true); setError(null); setItems([]); void sessionReady(manager, owner).then(() => manager.listConversations(owner)).then(p => { if (active) {
        setItems(p.items);
        setNext(p.next_cursor);
    } }).catch(e => { if (active)
        setError(e instanceof ApiError ? e.code : 'NETWORK'); }).finally(() => { if (active)
        setBusy(false); }); return () => { active = false; }; }, [manager, owner, attempt]));
    const more = async () => { if (!next || busy)
        return; setBusy(true); try {
        const p = await manager.listConversations(owner, next);
        setItems(v => [...v, ...p.items]);
        setNext(p.next_cursor);
        setError(null);
    }
    catch (e) {
        setError(e instanceof ApiError ? e.code : 'NETWORK');
    }
    finally {
        setBusy(false);
    } };
    const shown = items.filter(c => !jobId || c.job_ids.includes(jobId));
    return <><AppText tone="muted">{t('chat.intro')}</AppText><Button testID="chat-list-reload" label={t('accountTools.reload')} disabled={busy || auth.busy} onPress={() => setAttempt(v => v + 1)}/><JobFeedback error={error}/>{busy && <AppText>{t('accountTools.loading')}</AppText>}{!busy && !shown.length && <AppText>{t('chat.empty')}</AppText>}{shown.map(c => <Card key={c.id}><AppText variant="section">{c.display_name}</AppText><AppText>{t(c.kind === 'direct' ? 'chat.private' : 'chat.partner')}</AppText><AppText>{t('chat.unread', { count: c.unread })}</AppText><Button testID={`conversation-open-${c.id}`} label={t('chat.open')} onPress={() => open(c.id)}/></Card>)}{next && <Button label={t('accountTools.more')} disabled={busy || auth.busy} onPress={() => void more()}/>}</>;
}
