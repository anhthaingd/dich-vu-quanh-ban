import { useCallback, useState } from 'react';
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
    <ProductShell
      onBack={() => navigation.goBack()}
      onAccount={() => navigation.navigate('Account')}
    >
      <AppText variant="title">{t('search.profile')}</AppText>
      <Profile
        key={state.user?.id ?? state.phase}
        id={route.params.id}
        login={() => navigation.navigate('Account')}
      />
    </ProductShell>
  );
}
function Profile({ id, login }: { id: string; login: () => void }) {
  const { manager, state } = useAuth(),
    api = usePartnersApi(),
    { t, locale } = useLocale();
  const owner = state.user?.id;
  const [profile, setProfile] = useState<PartnerProfile | null>(null),
    [error, setError] = useState<string | null>(null),
    [attempt, setAttempt] = useState(0);
  useFocusEffect(
    useCallback(() => {
      const c = new AbortController();
      setProfile(null);
      setError(null);
      const work = owner
        ? manager.partnerProfile(owner, id, locale, c.signal)
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
      <Card>
        <AppText variant="title">{profile.name}</AppText>
        <AppText>{t(`partners.${profile.kind}`)}</AppText>
        <AppText>
          {t(
            profile.verification_status === 'verified'
              ? 'partners.verified'
              : 'partners.unverified'
          )}
        </AppText>
        <AppText>{profile.bio}</AppText>
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
            <AppText key={i}>{a.text}</AppText>
          ))}
        </Card>
      )}
      <Card>
        {profile.contact === null ? (
          <Button label={t('search.loginContact')} onPress={login} />
        ) : (
          <>
            <AppText variant="section">{t('partners.profile')}</AppText>
            {profile.contact.phone && (
              <AppText>{profile.contact.phone}</AppText>
            )}
            {profile.contact.zalo && <AppText>{profile.contact.zalo}</AppText>}
            {!profile.contact.phone && !profile.contact.zalo && (
              <AppText>{t('search.noContact')}</AppText>
            )}
          </>
        )}
        <AppText tone="muted">{t('search.comingNext')}</AppText>
      </Card>
    </>
  );
}
