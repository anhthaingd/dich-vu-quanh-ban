import {CallButton} from '../../calls/CallsProvider';
import {CustomerReviews} from '../../reviews/screens/CustomerReviews';
import {useRealtimeRefresh} from '../../../app/providers/RealtimeProvider';
import { formatBusinessDate } from '../../../lib/i18n/formatters';
import { useCallback, useState, useSyncExternalStore } from 'react';
import { Keyboard, Platform, Switch, View } from 'react-native';
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
import { Mutation } from '../state/mutation';
import { appointment } from '../state/appointment';
import { sessionOperation } from '../state/session-ready';
import { JobFeedback } from '../components/JobFeedback';
import type { Job, JobAction, JobChange, Member } from '../models';
import { ApiError, type ApiErrorCode } from '../../../lib/http/api-error';
export function JobDetailScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'JobDetail'>) { return <AccountPage title="jobs.detail" back={() => navigation.goBack()} login={() => navigation.navigate('Account',{returnTo:{screen:'JobDetail',params:{id:route.params.id}}})}>{owner => <Detail key={`${owner}:${route.params.id}`} id={route.params.id} owner={owner} support={() => navigation.navigate('Support', {context:{kind:'service',job_id:route.params.id}})} reviews={() => navigation.navigate('Reviews', { id:route.params.id })} invoice={() => navigation.navigate('Invoice', { id:route.params.id })} chat={() => navigation.navigate('Conversations', { jobId: route.params.id })}/>}</AccountPage>; }
function Detail({ id, owner, chat, invoice, reviews, support }: {
    id: string;
    owner: string;
    chat: () => void;
    invoice: () => void;
    reviews: () => void;
    support: () => void;
}) {
    const { manager, state: auth } = useAuth(), { t, locale } = useLocale();
    const [partnerName,setPartnerName]=useState('');
    const [names, setNames] = useState<Record<string, string>>({}), [job, setJob] = useState<Job | null>(null), [members, setMembers] = useState<Member[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState<ApiErrorCode | null>(null), [attempt, setAttempt] = useState(0);
    const [action, setAction] = useState<JobAction | null>(null), [reason, setReason] = useState(''), [eta, setEta] = useState('30'), [day, setDay] = useState(''), [time, setTime] = useState(''), [charges, setCharges] = useState(false), [member, setMember] = useState('');
    const [mutation] = useState(() => new Mutation<Job>());
    const state = useSyncExternalStore(mutation.subscribe, mutation.getSnapshot, mutation.getSnapshot);
    useRealtimeRefresh({error,resource:{type:'job',id},busy:busy||state.busy||state.pending||!!action,matches:s=>s.kind==='event'&&(s.event.data.job_id===id||s.event.type==='notification.created.v1'||s.event.type.startsWith('invoice.')),refresh:()=>setAttempt(v=>v+1),revoke:()=>{setJob(null);setAction(null);setError('NOT_FOUND');}});
    useFocusEffect(useCallback(() => {
        let active = true;
        setBusy(true);
        setError(null);
        void (async () => {
            const value = await sessionOperation(manager,owner,()=>manager.getJob(owner, id),()=>active);
            const people: Member[] = [];
            if (value.allowed_actions.includes('assignments')) {
                let cursor: string | undefined;
                do {
                    const p = await sessionOperation(manager,owner,()=>manager.jobMembers(owner, value.partner_id, cursor),()=>active);
                    people.push(...p.items);
                    cursor = p.next_cursor ?? undefined;
                } while (cursor && active);
            }
            let labels: Record<string, string> = {};
            try {
                const p = await sessionOperation(manager,owner,()=>manager.partnerProfile(owner, value.partner_id, locale),()=>active);
                if(active)setPartnerName(p.name);
                labels = Object.fromEntries(p.skills.map(s => [s.id, s.name]));
            }
            catch { /* Historical jobs remain readable when the public profile is unavailable. */ }
            if (active) {
                setJob(value);
                setMembers(people);
                setNames(labels);
            }
        })().catch(e => { if (active) {
            const code = e instanceof ApiError ? e.code : 'NETWORK';
            setError(code);
            if (['FORBIDDEN', 'NOT_FOUND', 'UNAUTHENTICATED'].includes(code))
                setJob(null);
        } }).finally(() => { if (active)
            setBusy(false); });
        return () => { active = false; };
    }, [manager, owner, id, attempt, locale]));
    const draftingBlocked = state.busy || state.pending;
    const blocked = busy || auth.busy || draftingBlocked;
    const finished = (value: Job | null) => { if (value) {
        setJob(value);
        setAction(null);
        setAttempt(v => v + 1);
    } };
    const submit = async () => {
        if (!job || !action)
            return;
        const input: JobChange = { expected_version: job.version };
        if (action === 'accept' && job.time_mode === 'now') {
            if (!/^\d+$/.test(eta) || +eta < 1 || !Number.isSafeInteger(+eta) || !Number.isFinite(new Date(Date.now() + Number(eta) * 60000).getTime())) {
                setError('VALIDATION');
                return;
            }
            input.eta = new Date(Date.now() + Number(eta) * 60000).toISOString();
        }
        if (['decline', 'withdraw', 'stop'].includes(action)) {
            if (!reason.trim()) {
                setError('VALIDATION');
                return;
            }
            input.reason = reason.trim();
        }
        if (action === 'reschedule') {
            const date = appointment(day, time);
            if (!date || Date.parse(date) <= Date.now()) {
                setError('VALIDATION');
                return;
            }
            input.scheduled_at = date;
            input.reason = reason;
        }
        if (action === 'stop')
            input.has_agreed_charges = charges;
        if (action === 'assignments') {
            if (!member) {
                setError('VALIDATION');
                return;
            }
            input.membership_id = member;
        }
        setError(null);
        finished(await mutation.run(key => manager.changeJob(owner, id, action, input, key)));
    };
    return <><JobFeedback error={error}/>{busy && !job && <AppText>{t('accountTools.loading')}</AppText>}{job && <><Card><View style={{alignSelf:'flex-start',backgroundColor:'#e9f5ed',borderRadius:20,paddingHorizontal:12,paddingVertical:6}}><AppText testID="job-state" variant="caption" tone="success">{t(`jobs.${job.state}`)}</AppText></View>{job.skills.map(s => <AppText variant="section" key={s.skill_id}>{names[s.skill_id] ?? s.skill_id}</AppText>)}{!!partnerName&&<AppText variant="card">{partnerName}</AppText>}<AppText tone="muted">{t(`partners.${job.service_mode}`)} · {t(job.time_mode === 'now' ? 'jobs.now' : 'jobs.scheduled')}</AppText><AppText>{job.address.text}</AppText><AppText>{job.note}</AppText>{job.scheduled_at && <AppText>{t('jobs.appointment', { time: formatBusinessDate(new Date(job.scheduled_at), locale) })}</AppText>}{job.eta && <AppText>{t('jobs.arrival', { time: formatBusinessDate(new Date(job.eta), locale) })}</AppText>}<AppText tone="muted">{t('jobs.noAutoClose')}</AppText></Card>{(job.invoice_id || job.state==='accepted' || job.state==='awaiting_settlement' || job.state==='completed') && <Button testID="job-invoice" label={t('invoice.open')} onPress={invoice}/>}<Button testID="job-support" variant="link" label={t('support.title')} disabled={blocked} onPress={support}/>{job.state==='completed' && <Button testID="job-reviews" label={t('reviews.title')} onPress={reviews}/>}<CallButton jobId={id}/><Button testID="job-chat" variant="secondary" label={t('chat.title')} onPress={chat}/>
 {job.customer_id!==owner&&<CustomerReviews owner={owner} job={id}/>}
 {!action && job.allowed_actions.filter((a):a is JobAction=>a!=='invoice'&&a!=='confirm_receipt').map(a => <Button key={a} testID={`job-action-${a}`} label={t(`jobs.${a}`)} disabled={draftingBlocked} variant={a === 'accept' ? 'primary' : 'secondary'} onPress={() => { setAction(a); setReason(''); setError(null); }}/>)}
 {action && <Card><AppText variant="section">{t(`jobs.${action}`)}</AppText>{action === 'accept' && job.time_mode === 'now' && <Input testID="job-eta" label={t('jobs.etaMinutes')} value={eta} editable={!draftingBlocked} keyboardType={Platform.OS==='ios'?'numbers-and-punctuation':'number-pad'} returnKeyType="done" onSubmitEditing={()=>Keyboard.dismiss()} onChangeText={setEta}/>}{['decline', 'withdraw', 'stop', 'reschedule'].includes(action) && <Input testID="job-reason" label={t('jobs.reason')} value={reason} editable={!draftingBlocked} multiline onChangeText={setReason}/>}{action === 'reschedule' && <><Input testID="job-date" label={t('jobs.date')} value={day} editable={!draftingBlocked} onChangeText={setDay}/><Input testID="job-time" label={t('jobs.time')} value={time} editable={!draftingBlocked} onChangeText={setTime}/><AppText>{t('jobs.timeHint')}</AppText></>}{action === 'stop' && <><AppText>{t('jobs.agreedCharges')}</AppText><Switch testID="job-charges" accessibilityLabel={t('jobs.agreedCharges')} disabled={blocked} value={charges} onValueChange={setCharges}/><AppText tone="muted">{t('jobs.stopHint')}</AppText></>}{action === 'assignments' && members.filter(m => m.active).map(m => <Button key={m.id} testID={`job-member-${m.id}`} label={m.display_name + (m.user_id === owner ? ` · ${t('jobs.me')}` : '')} disabled={blocked} variant={member === m.id ? 'primary' : 'secondary'} onPress={() => setMember(m.id)}/>)}<Button testID="job-action-confirm" label={t('jobs.confirmAction')} disabled={blocked} onPress={() => void submit()}/><Button label={t('accountTools.cancel')} disabled={blocked} variant="secondary" onPress={() => setAction(null)}/></Card>}
 <Button variant="link" testID="job-reload" label={t('accountTools.reload')} disabled={blocked} onPress={() => setAttempt(v => v + 1)}/>
 <JobFeedback error={state.error} pending={state.pending} busy={state.busy || auth.busy} retry={state.pending ? () => void mutation.run().then(finished) : undefined}/>{(state.error === 'VERSION_CONFLICT' || state.error === 'STATE_CONFLICT') && <AppText>{t('jobs.reloadBeforeRetry')}</AppText>}</>}</>;
}
