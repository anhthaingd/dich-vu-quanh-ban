import { useEffect, useState, useSyncExternalStore } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../app/navigation/routes';
import { useAuth } from '../../../app/providers/AuthProvider';
import { useLocale } from '../../../app/providers/LocaleProvider';
import { AppText } from '../../../components/ui/AppText';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { AccountPage } from '../components/AccountPage';
import { CollectionStatus } from '../components/CollectionStatus';
import { AccountCollection } from '../state/account-collection';
import { SessionRevocation } from '../state/session-revocation';
import type { LoginSession } from '../models';
export function SessionsScreen({ navigation }: NativeStackScreenProps<RootStackParamList,'Sessions'>) {
  return <AccountPage title="sessions.title" back={() => navigation.goBack()} login={() => navigation.replace('Account', { returnTo: 'Sessions' })}>
    {owner => <Sessions key={owner} owner={owner} />}
  </AccountPage>;
}
function Sessions({ owner }: { owner: string }) {
  const { manager, state: auth } = useAuth(); const { t, locale } = useLocale();
  const [collection] = useState(() => new AccountCollection<LoginSession>(cursor => manager.listSessions(owner,cursor)));
  const state = useSyncExternalStore(collection.subscribe,collection.getSnapshot,collection.getSnapshot);
  const [batch] = useState(() => new SessionRevocation(cursor => manager.listSessions(owner, cursor), (id, key) => manager.revokeSession(owner, id, false, key)));
  const bulk = useSyncExternalStore(batch.subscribe, batch.getSnapshot, batch.getSnapshot);
  const bulkLocked = !['idle', 'done'].includes(bulk.phase);
  const runBatch = async () => { await batch.run(); if (batch.getSnapshot().phase === 'done') await collection.load(); };
  const [confirm, setConfirm] = useState<LoginSession | null>(null);
  useEffect(() => { void collection.load(); }, [collection]);
  const disabled = state.busy || state.pending || auth.busy || bulkLocked;
  const date = (x: string | null) => x ? new Date(x).toLocaleString(locale === 'vi' ? 'vi-VN' : locale === 'ja' ? 'ja-JP' : 'en-US') : t('sessions.unknown');
  return <>
    <AppText tone="muted">{t('sessions.intro')}</AppText>
    <Card>
      <Button testID="sessions-revoke-others" label={t('sessions.revokeOthers')} disabled={disabled || !!confirm || !state.loaded} onPress={() => void batch.prepare()} />
      {bulk.phase === 'preparing' && <AppText>{t('sessions.preparing')}</AppText>}
      {bulk.phase === 'confirm' && <>
        <AppText>{t('sessions.confirmOthers', { count: bulk.total })}</AppText>
        <Button testID="sessions-confirm-others" label={t('sessions.revokeOthers')} disabled={auth.busy} onPress={() => void runBatch()} />
        <Button testID="sessions-cancel-others" label={t('accountTools.cancel')} variant="secondary" onPress={batch.cancel} />
      </>}
      {['running', 'failed'].includes(bulk.phase) && <AppText testID="sessions-batch-progress" accessibilityLiveRegion="polite">{t('sessions.progress', { completed: bulk.completed, total: bulk.total })}</AppText>}
      {bulk.error && <AppText accessibilityRole="alert" tone="error">{t('sessions.batchError')}</AppText>}
      {bulk.phase === 'failed' && <Button testID="sessions-batch-retry" label={t('common.retry')} disabled={auth.busy} onPress={() => void runBatch()} />}
      {bulk.phase === 'done' && <AppText testID="sessions-batch-done" accessibilityLiveRegion="polite">{t(bulk.total ? 'sessions.batchDone' : 'sessions.noOthers', { count: bulk.completed })}</AppText>}
    </Card>
    <CollectionStatus state={state} blocked={bulkLocked} retry={() => void collection.perform().then(ok => { if(ok) setConfirm(null); })} reload={() => void collection.load()} />
    {confirm && <Card>
      <AppText>{t(confirm.is_current ? 'sessions.confirmCurrent' : 'sessions.confirm')}</AppText>
      <Button testID="session-confirm" label={t('sessions.revoke')} disabled={disabled} onPress={() => void collection.perform(key => manager.revokeSession(owner,confirm.id,confirm.is_current,key)).then(ok => { if(ok) setConfirm(null); })} />
      <Button label={t('accountTools.cancel')} variant="secondary" disabled={disabled} onPress={() => setConfirm(null)} />
    </Card>}
    {state.loaded && !state.items.length && <AppText>{t('sessions.empty')}</AppText>}
    {state.items.map(item => <Card key={item.id} testID={`session-${item.id}`}>
      <AppText variant="card">{t(item.is_current ? 'sessions.current' : 'sessions.other')}</AppText>
      <AppText>{t('sessions.created', { date: date(item.created_at) })}</AppText>
      <AppText>{t('sessions.seen', { date: date(item.last_seen_at) })}</AppText>
      <AppText>{t(item.state === 'active' ? 'sessions.active' : item.state === 'revoked' ? 'sessions.revoked' : 'sessions.expired')}</AppText>
      {item.state === 'active' && <Button testID={item.is_current ? 'session-revoke-current' : 'session-revoke-other'} label={t('sessions.revoke')} variant="secondary" disabled={disabled} onPress={() => setConfirm(item)} />}
    </Card>)}
    {state.next && <Button label={t('accountTools.more')} disabled={disabled} onPress={() => void collection.load(true)} />}
  </>;
}
