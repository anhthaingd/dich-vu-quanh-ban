import { formatBusinessDate } from '../../../lib/i18n/formatters';
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
import { JobFeedback } from '../components/JobFeedback';
import { sessionReady } from '../state/session-ready';
import type { Job } from '../models';
export function JobsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Jobs'>) { return <AccountPage title="jobs.title" back={() => navigation.goBack()} login={() => navigation.navigate('Account', { returnTo: 'Jobs' })}>{owner => <List key={owner} owner={owner} open={id => navigation.navigate('JobDetail', { id })}/>}</AccountPage>; }
function List({ owner, open }: {
    owner: string;
    open: (id: string) => void;
}) {
    const { manager, state: auth } = useAuth(), { t, locale } = useLocale();
    const [partner, setPartner] = useState<string | undefined>(), [partners, setPartners] = useState<{
        id: string;
        name: string;
    }[]>([]), [items, setItems] = useState<Job[]>([]), [next, setNext] = useState<string | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<ApiErrorCode | null>(null), [attempt, setAttempt] = useState(0);
    useFocusEffect(useCallback(() => {
        let active = true;
        setBusy(true);
        setItems([]);
        setError(null);
        void (async () => { await sessionReady(manager, owner); const me = await manager.loadProfile(owner); const choices = []; for (const id of me.partner_ids) {
            try {
                const p = await manager.loadPartner(owner, id);
                choices.push({ id, name: p.name });
            }
            catch {
                choices.push({ id, name: id.slice(0, 8) });
            }
        } const page = await manager.listJobs(owner, partner); if (active) {
            setPartners(choices);
            setItems(page.items);
            setNext(page.next_cursor);
        } })().catch(e => { if (active)
            setError(e instanceof ApiError ? e.code : 'NETWORK'); }).finally(() => { if (active)
            setBusy(false); });
        return () => { active = false; };
    }, [manager, owner, partner, attempt]));
    const more = async () => { if (!next || busy)
        return; setBusy(true); try {
        const page = await manager.listJobs(owner, partner, next);
        setItems(v => [...v, ...page.items]);
        setNext(page.next_cursor);
        setError(null);
    }
    catch (e) {
        setError(e instanceof ApiError ? e.code : 'NETWORK');
    }
    finally {
        setBusy(false);
    } };
    return <><AppText tone="muted">{t('jobs.listIntro')}</AppText><Card><Button testID="jobs-customer" label={t('jobs.customerJobs')} variant={partner ? 'secondary' : 'primary'} disabled={busy} onPress={() => setPartner(undefined)}/>{partners.map(p => <Button key={p.id} testID={`jobs-partner-${p.id}`} label={t('jobs.partnerJobs', { name: p.name })} variant={partner === p.id ? 'primary' : 'secondary'} disabled={busy} onPress={() => setPartner(p.id)}/>)}</Card><Button testID="jobs-reload" label={t('accountTools.reload')} disabled={busy || auth.busy} onPress={() => setAttempt(v => v + 1)}/><JobFeedback error={error} retry={() => setAttempt(v => v + 1)}/>{busy && <AppText>{t('accountTools.loading')}</AppText>}{!busy && !error && !items.length && <AppText>{t('jobs.empty')}</AppText>}{items.map(j => <Card key={j.id}><AppText variant="section">{t(`jobs.${j.state}`)}</AppText><AppText>{j.address.text}</AppText><AppText>{j.note}</AppText>{j.scheduled_at && <AppText>{formatBusinessDate(new Date(j.scheduled_at), locale)}</AppText>}<Button testID={`job-open-${j.id}`} label={t('jobs.detail')} onPress={() => open(j.id)}/></Card>)}{next && <Button label={t('accountTools.more')} disabled={busy || auth.busy} onPress={() => void more()}/>}</>;
}
