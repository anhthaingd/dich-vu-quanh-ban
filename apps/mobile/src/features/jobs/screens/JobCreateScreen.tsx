import { useEffect, useState, useSyncExternalStore } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../app/navigation/routes';
import { AccountPage } from '../../accounts/components/AccountPage';
import { useAuth } from '../../../app/providers/AuthProvider';
import { useLocale } from '../../../app/providers/LocaleProvider';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { AppText } from '../../../components/ui/AppText';
import { LocationField } from '../../location/components/LocationField';
import type { LocationValue } from '../../location/models';
import type { PartnerProfile, Mode } from '../../partners/models';
import { Mutation } from '../state/mutation';
import { appointment } from '../state/appointment';
import { sessionReady } from '../state/session-ready';
import { JobFeedback } from '../components/JobFeedback';
import type { Job, JobCreate } from '../models';
import { ApiError, type ApiErrorCode } from '../../../lib/http/api-error';
export function JobCreateScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'JobCreate'>) { return <AccountPage title="jobs.create" back={() => navigation.goBack()} login={() => navigation.navigate('Account')}>{owner => <Form key={`${owner}:${route.params.partnerId}`} owner={owner} partnerId={route.params.partnerId} done={id => navigation.replace('JobDetail', { id })}/>}</AccountPage>; }
function Form({ owner, partnerId, done }: {
    owner: string;
    partnerId: string;
    done: (id: string) => void;
}) {
    const { manager, state: auth } = useAuth(), { t, locale } = useLocale();
    const [profile, setProfile] = useState<PartnerProfile | null>(null), [loadError, setLoadError] = useState<ApiErrorCode | null>(null), [attempt, setAttempt] = useState(0);
    const [selected, setSelected] = useState<string[]>([]), [mode, setMode] = useState<Mode>('at_customer'), [place, setPlace] = useState<LocationValue | null>(null), [location, setLocation] = useState(''), [scheduled, setScheduled] = useState(false), [day, setDay] = useState(''), [time, setTime] = useState(''), [note, setNote] = useState(''), [invalid, setInvalid] = useState(false);
    const [answers, setAnswers] = useState<Record<string, Record<string, unknown>>>({});
    const [mutation] = useState(() => new Mutation<Job>());
    const state = useSyncExternalStore(mutation.subscribe, mutation.getSnapshot, mutation.getSnapshot);
    const blocked = state.busy || state.pending || auth.busy;
    useEffect(() => { let active = true; setLoadError(null); void sessionReady(manager, owner).then(() => manager.partnerProfile(owner, partnerId, locale)).then(p => { if (active)
        setProfile(p); }).catch(e => { if (active)
        setLoadError(e instanceof ApiError ? e.code : 'NETWORK'); }); return () => { active = false; }; }, [manager, owner, partnerId, locale, attempt]);
    const send = async () => {
        const shop = profile?.public_locations.find(x => x.id === location), address = mode === 'at_shop' ? shop?.address : place ? { text: place.text, point: place.point } : null;
        const at = scheduled ? appointment(day, time) : null;
        if (!address || !selected.length || !selected.every(id => profile?.service_modes.some(s => s.skill_id === id && s.modes.includes(mode))) || (scheduled && (!at || Date.parse(at) <= Date.now()))) {
            setInvalid(true);
            return;
        }
        const input: JobCreate = { partner_id: partnerId, skills: selected.map(id => ({ skill_id: id, schema_version: profile!.skills.find(s => s.id === id)!.schema_version, answers: answers[id] ?? {} })), service_mode: mode, address, time_mode: scheduled ? 'scheduled' : 'now', ...(mode === 'at_shop' ? { location_id: location } : {}), ...(at ? { scheduled_at: at } : {}), note };
        setInvalid(false);
        const value = await mutation.run(key => manager.createJob(owner, input, key));
        if (value)
            done(value.id);
    };
    if (!profile)
        return <><JobFeedback error={loadError} retry={() => setAttempt(v => v + 1)}/>{!loadError && <AppText>{t('accountTools.loading')}</AppText>}</>;
    return <><AppText variant="section">{profile.name}</AppText><AppText tone="muted">{t('jobs.createIntro')}</AppText>{!auth.user?.phone_verified && <AppText>{t('partners.verifyNeeded')}</AppText>}<Card><AppText variant="section">{t('jobs.chooseSkills')}</AppText>{profile.skills.map(s => <Button key={s.id} testID={`job-skill-${s.id}`} label={s.name} variant={selected.includes(s.id) ? 'primary' : 'secondary'} disabled={blocked} onPress={() => setSelected(v => v.includes(s.id) ? v.filter(x => x !== s.id) : [...v, s.id])}/>)}</Card>
 {profile.skills.filter(s => selected.includes(s.id)).map(s => { const properties = (s.form_schema as {
        properties?: Record<string, {
            title?: string;
            type?: string;
            enum?: string[];
        }>;
    }).properties ?? {}; return Object.keys(properties).length ? <Card key={s.id}><AppText>{s.name}</AppText>{Object.entries(properties).map(([key, field]) => <Input key={key} label={field.title ?? key} value={String(answers[s.id]?.[key] ?? '')} editable={!blocked} onChangeText={v => setAnswers(a => ({ ...a, [s.id]: { ...a[s.id], [key]: field.type === 'number' || field.type === 'integer' ? Number(v) : field.type === 'boolean' ? v === 'true' : v } }))}/>)}</Card> : null; })}
 <Card><AppText variant="section">{t('jobs.where')}</AppText>{(['at_customer', 'at_shop', 'custom'] as const).map(m => <Button key={m} testID={`job-mode-${m}`} label={t(`partners.${m}`)} variant={mode === m ? 'primary' : 'secondary'} disabled={blocked || !selected.length || !selected.every(id => profile.service_modes.some(s => s.skill_id === id && s.modes.includes(m)))} onPress={() => setMode(m)}/>)}{mode === 'at_shop' ? profile.public_locations.map(l => <Button key={l.id} testID={`job-location-${l.id}`} label={l.address.text} disabled={blocked} variant={location === l.id ? 'primary' : 'secondary'} onPress={() => setLocation(l.id)}/>) : <LocationField prefix="job" lat={place ? String(place.point.latitude) : ''} lng={place ? String(place.point.longitude) : ''} text={place?.text} disabled={blocked} onChange={setPlace}/>}</Card>
 <Card><Button testID="job-time-now" label={t('jobs.now')} disabled={blocked} variant={scheduled ? 'secondary' : 'primary'} onPress={() => setScheduled(false)}/><Button testID="job-time-scheduled" label={t('jobs.scheduled')} disabled={blocked} variant={scheduled ? 'primary' : 'secondary'} onPress={() => setScheduled(true)}/>{scheduled && <><Input testID="job-date" label={t('jobs.date')} value={day} editable={!blocked} onChangeText={setDay}/><Input testID="job-time" label={t('jobs.time')} value={time} editable={!blocked} onChangeText={setTime}/><AppText tone="muted">{t('jobs.timeHint')}</AppText></>}<Input testID="job-note" label={t('jobs.note')} value={note} editable={!blocked} multiline onChangeText={setNote}/></Card>
 {invalid && <JobFeedback error="VALIDATION"/>}<JobFeedback error={state.error} pending={state.pending} busy={blocked && !state.pending} retry={state.pending ? () => void mutation.run().then(v => { if (v)
        done(v.id); }) : undefined}/><Button testID="job-submit" label={t('jobs.send')} disabled={blocked || !profile.can_hire} onPress={() => void send()}/></>;
}
