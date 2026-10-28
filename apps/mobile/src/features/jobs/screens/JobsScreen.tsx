import {useProductRole} from '../../../app/providers/ProductRoleProvider';
import { View } from 'react-native';
import { JobCalendar } from '../components/JobCalendar';
import { businessDay, loadCalendarJobs } from '../state/calendar';
import {useRealtimeRefresh} from '../../../app/providers/RealtimeProvider';
import { formatBusinessDate } from '../../../lib/i18n/formatters';
import { useCallback, useRef, useState } from 'react';
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
import { sessionOperation,sessionReady } from '../state/session-ready';
import type { Job } from '../models';
export function JobsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Jobs'>) { const role=useProductRole();return <AccountPage shell={{root:true,onWallet:id=>navigation.navigate('Finance',{id}), activeTab: 'jobs', onAccount: () => navigation.navigate('Account'), onCatalog: () => navigation.popTo('CatalogHome'), onJobs: () => navigation.navigate('Jobs'), onNotifications: () => navigation.navigate('Notifications'), onMessages: () => navigation.navigate('Conversations') }} title="jobs.title" back={() => navigation.goBack()} login={() => navigation.navigate('Account', { returnTo: 'Jobs' })}>{owner => <List key={owner+role.membership?.partner_id} owner={owner} initialPartner={role.membership?.partner_id} open={id => navigation.navigate('JobDetail', { id })}/>}</AccountPage>; }
function List({ owner, open,initialPartner }: {
    owner: string;initialPartner?:string;
    open: (id: string) => void;
}) {
    const role=useProductRole();
    const changePartner=async(id?:string)=>{if(!role.available){setPartner(id);return;}setBusy(true);try{await role.choose(id??null);}catch(e){setError(e instanceof ApiError?e.code:'NETWORK');}finally{setBusy(false);}};
    const { manager, state: auth } = useAuth(), { t, locale } = useLocale();
    const generation = useRef(0);
    const [calendar, setCalendar] = useState(false);
    const [selected, setSelected] = useState(() => businessDay(new Date()));
    const [partner, setPartner] = useState<string | undefined>(initialPartner), [partners, setPartners] = useState<{
        id: string;
        name: string;
    }[]>([]), [items, setItems] = useState<Job[]>([]), [next, setNext] = useState<string | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<ApiErrorCode | null>(null), [attempt, setAttempt] = useState(0);
    useRealtimeRefresh({error,busy,matches:s=>s.kind==='event'&&(s.event.type.startsWith('job.')||s.event.type.startsWith('invoice.')||s.event.type==='notification.created.v1'),refresh:()=>setAttempt(v=>v+1)});
    useFocusEffect(useCallback(() => {
        let active = true;
        const epoch = ++generation.current;
        setBusy(true);
        setItems([]);
        setNext(null);
        setError(null);
        void (async () => { await sessionReady(manager, owner); const me = await sessionOperation(manager,owner,()=>manager.loadProfile(owner),()=>active); const choices = []; for (const id of me.partner_ids) {
            try {
                const p = await sessionOperation(manager,owner,()=>manager.loadPartner(owner,id),()=>active);
                choices.push({ id, name: p.name });
            }
            catch {
                choices.push({ id, name: role.membership?.partner_id===id?role.membership.partner_name:id.slice(0, 8) });
            }
        } if (!active) return;
        const page = calendar
          ? {items: await loadCalendarJobs(c => sessionOperation(manager,owner,()=>manager.listJobs(owner,partner,c),()=>active), () => active && generation.current === epoch), next_cursor: null}
          : await sessionOperation(manager,owner,()=>manager.listJobs(owner,partner),()=>active);
        if (active && page.items) {
            setPartners(choices);
            setItems(page.items);
            setNext(page.next_cursor);
        } })().catch(e => { if (active)
            setError(e instanceof ApiError ? e.code : 'NETWORK'); }).finally(() => { if (active)
            setBusy(false); });
        return () => { active = false; generation.current++; };
    }, [manager, owner, partner, attempt, calendar]));
    const more = async () => { if (!next || busy)
        return; const epoch = generation.current; setBusy(true); try {
        const page = await manager.listJobs(owner, partner, next);
        if (generation.current !== epoch) return;
        setItems(v => [...new Map([...v, ...page.items].map(j => [j.id, j])).values()]);
        setNext(page.next_cursor);
        setError(null);
    }
    catch (e) {
        if (generation.current === epoch) setError(e instanceof ApiError ? e.code : 'NETWORK');
    }
    finally {
        if (generation.current === epoch) setBusy(false);
    } };
    return <><View style={{flexDirection: 'row', gap: 8}}><View style={{flex: 1}}><Button testID="jobs-view-list" label={t('calendar.list')} variant={calendar ? 'secondary' : 'primary'} accessibilityState={{selected: !calendar}} disabled={busy} onPress={() => setCalendar(false)}/></View><View style={{flex: 1}}><Button testID="jobs-view-calendar" label={t('calendar.title')} variant={calendar ? 'primary' : 'secondary'} accessibilityState={{selected: calendar}} disabled={busy} onPress={() => setCalendar(true)}/></View></View><AppText tone="muted">{t('jobs.listIntro')}</AppText><Card><Button testID="jobs-customer" label={t('jobs.customerJobs')} variant={partner ? 'secondary' : 'primary'} disabled={busy} onPress={() => void changePartner()}/>{partners.map(p => <Button key={p.id} testID={`jobs-partner-${p.id}`} label={t('jobs.partnerJobs', { name: p.name })} variant={partner === p.id ? 'primary' : 'secondary'} disabled={busy} onPress={() => void changePartner(p.id)}/>)}</Card><Button testID="jobs-reload" label={t('accountTools.reload')} disabled={busy || auth.busy} onPress={() => setAttempt(v => v + 1)}/><JobFeedback error={error} retry={() => setAttempt(v => v + 1)}/>{busy && <AppText>{t('accountTools.loading')}</AppText>}{!calendar && !busy && !error && !items.length && <AppText>{t('jobs.empty')}</AppText>}{calendar ? !error && <JobCalendar loading={busy} items={items} open={open} selected={selected} setSelected={setSelected}/> : items.map(j => <Card key={j.id}><AppText variant="section">{t(`jobs.${j.state}`)}</AppText><AppText>{j.address.text}</AppText><AppText>{j.note}</AppText>{j.scheduled_at && <AppText>{formatBusinessDate(new Date(j.scheduled_at), locale)}</AppText>}<Button testID={`job-open-${j.id}`} label={t('jobs.detail')} onPress={() => open(j.id)}/></Card>)}{next && <Button label={t('accountTools.more')} disabled={busy || auth.busy} onPress={() => void more()}/>}</>;
}
