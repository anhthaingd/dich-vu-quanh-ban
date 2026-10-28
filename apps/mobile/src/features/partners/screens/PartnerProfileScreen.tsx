import {PublicGallery} from '../components/PublicGallery';
import {PartnerReviews} from '../../reviews/screens/PartnerReviews';
import {sessionReady} from '../../jobs/state/session-ready';
import {Mutation} from '../../jobs/state/mutation';
import {JobFeedback} from '../../jobs/components/JobFeedback';
import type {Conversation} from '../../chat/models';
import { PublicLocation } from '../../location/components/PublicLocation';
import { useCallback, useState, useSyncExternalStore } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../app/navigation/routes';
import { ProductShell } from '../../../app/layout/ProductShell';
import { useAuth } from '../../../app/providers/AuthProvider';
import { usePartnersApi } from '../../../app/providers/AppProviders';
import { useLocale } from '../../../app/providers/LocaleProvider';
import { Card } from '../../../components/ui/Card';
import { AppText } from '../../../components/ui/AppText';
import { Button } from '../../../components/ui/Button';
import { ErrorState, LoadingState } from '../../../components/ui/Feedback';
import { ApiError } from '../../../lib/http/api-error';
import type { PartnerProfile } from '../models';
export function PartnerProfileScreen({
  navigation,
  route
}: NativeStackScreenProps<RootStackParamList, 'PartnerProfile'>) {
  const { state } = useAuth(),
    { t } = useLocale();
  return (
    <ProductShell title={t('search.profile')}
      onBack={() => navigation.goBack()}
      onAccount={() => navigation.navigate('Account')}
    >
      <Profile
        key={state.user?.id ?? state.phase}
        id={route.params.id}
        login={() => navigation.navigate('Account',{returnTo:{screen:'PartnerProfile',params:{id:route.params.id}}})}
        hire={()=>navigation.navigate('JobCreate',{partnerId:route.params.id})}
        chat={id=>navigation.navigate('Conversation',{id})}
      />
    </ProductShell>
  );
}
function Profile({ id, login, hire, chat }: { id: string; login: () => void; hire:()=>void; chat:(id:string)=>void }) {
  const { manager, state } = useAuth(),
    api = usePartnersApi(),
    { t, locale } = useLocale();
  const owner = state.user?.id;
  const [opening]=useState(()=>new Mutation<Conversation>());
  const openingState=useSyncExternalStore(opening.subscribe,opening.getSnapshot,opening.getSnapshot);
  const openChat=async()=>{if(owner){const c=await opening.run(key=>manager.openConversation(owner,{partner_id:id},key));if(c)chat(c.id);}};
  const [profile, setProfile] = useState<PartnerProfile | null>(null),
    [error, setError] = useState<string | null>(null),
    [attempt, setAttempt] = useState(0);
  useFocusEffect(
    useCallback(() => {
      const c = new AbortController();
      setProfile(null);
      setError(null);
      const work = owner
        ? (async()=>{
            for(let retries=0;;retries++){
              await sessionReady(manager,owner);
              if(c.signal.aborted)throw new ApiError('CANCELLED');
              try{return await manager.partnerProfile(owner,id,locale,c.signal);}
              catch(e){if(!(e instanceof ApiError)||e.code!=='BUSY'||retries>=2)throw e;}
            }
          })()
        : api.profile(id, locale, c.signal);
      work
        .then((p) => {
          if (!c.signal.aborted) setProfile(p);
        })
        .catch((e) => {
          if (!c.signal.aborted)
            setError(e instanceof ApiError ? e.code : 'NETWORK');
        });
      return () => c.abort();
    }, [api, manager, owner, id, locale, attempt])
  );
  if (error)
    return (
      <ErrorState
        message={t(error === 'NOT_FOUND' ? 'search.notFound' : 'search.error')}
        retryLabel={t('common.retry')}
        onRetry={() => setAttempt((n) => n + 1)}
      />
    );
  if (!profile) return <LoadingState message={t('accountTools.loading')} />;
  return (
    <>
      <PublicGallery id={id} featured/>
      <Card style={{padding:0,borderWidth:0,gap:10}}>
        <AppText variant="title">{profile.name}</AppText>
        <AppText>{t(`partners.${profile.kind}`)}</AppText>
        <AppText style={{alignSelf:'flex-start',borderRadius:20,paddingHorizontal:12,paddingVertical:6,backgroundColor:'#eff3fb'}} variant="caption" tone="primary">
          {t(
            profile.verification_status === 'verified'
              ? 'partners.verified'
              : 'partners.unverified'
          )}
        </AppText>
        <AppText>{profile.bio}</AppText>
      </Card>
      <Card>
        {profile.contact === null ? (
          <Button label={t('search.loginContact')} onPress={login} />
        ) : (
          <>
            <AppText variant="caption" tone="muted">{t('partners.profile')}</AppText>
            {profile.contact.phone && (
              <AppText>{profile.contact.phone}</AppText>
            )}
            {profile.contact.zalo && <AppText>{profile.contact.zalo}</AppText>}
            {!profile.contact.phone && !profile.contact.zalo && (
              <AppText>{t('search.noContact')}</AppText>
            )}
          </>
        )}
        {profile.can_hire&&<Button testID="profile-hire" label={t('jobs.create')} disabled={state.busy} onPress={hire}/>}
        {profile.can_message&&<Button testID="profile-chat" variant="secondary" label={t('chat.open')} disabled={state.busy||openingState.pending} onPress={()=>void openChat()}/>}
        <JobFeedback error={openingState.error} pending={openingState.pending} busy={openingState.busy||state.busy} retry={openingState.pending?()=>void opening.run().then(c=>{if(c)chat(c.id);}):undefined}/>
      </Card>
      <Card>
        <AppText variant="section">
          {t('catalog.skills', { count: profile.skills.length })}
        </AppText>
        {profile.skills.map((s) => (
          <AppText key={s.id}>{s.name}</AppText>
        ))}
      </Card>
      {!!profile.public_addresses.length && (
        <Card>
          <AppText variant="section">{t('partners.locations')}</AppText>
          {profile.public_addresses.map((a, i) => (
            <PublicLocation key={i} text={a.text} point={a.point} />
          ))}
        </Card>
      )}

      <PartnerReviews key={id} id={id}/>
    </>
  );
}
