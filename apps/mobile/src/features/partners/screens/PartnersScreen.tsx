import {financeText} from '../../finance/messages';
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
import { LoadingState, ErrorState } from '../../../components/ui/Feedback';
import { ApiError } from '../../../lib/http/api-error';
import type { Partner } from '../models';
export function PartnersScreen({
  navigation
}: NativeStackScreenProps<RootStackParamList, 'Partners'>) {
  return (
    <AccountPage
      title="partners.title"
      back={() => navigation.goBack()}
      login={() => navigation.navigate('Account', { returnTo: 'Partners' })}
    >
      {(owner) => (
        <Profiles
          key={owner}
          owner={owner}
          open={(id) => navigation.navigate('PartnerEditor', { id })}
          wallet={(id)=>navigation.navigate('Finance',{id})}
        />
      )}
    </AccountPage>
  );
}
function Profiles({
  owner,
  wallet,
  open
}: {
  owner: string;
  wallet:(id:string)=>void;
  open: (id?: string) => void;
}) {
  const { manager, state } = useAuth(),
    { t,locale } = useLocale();
  const [items, setItems] = useState<Partner[]>([]),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setBusy(true);
      setError(false);
      void (async () => {
        const me = await manager.loadProfile(owner);
        const values: Partner[] = [];
        for (const id of me.partner_ids) {
          if (!active) return;
          try {
            values.push(await manager.loadPartner(owner, id));
          } catch (e) {
            if (
              !(e instanceof ApiError) ||
              !['FORBIDDEN', 'NOT_FOUND'].includes(e.code)
            )
              throw e;
          }
        }
        if (active) setItems(values);
      })()
        .catch(() => {
          if (active) setError(true);
        })
        .finally(() => {
          if (active) setBusy(false);
        });
      return () => {
        active = false;
      };
    }, [manager, owner, attempt])
  );
  return (
    <>
      <AppText tone="muted">{t('partners.intro')}</AppText>
      {busy ? (
        <LoadingState message={t('accountTools.loading')} />
      ) : error ? (
        <ErrorState
          message={t('partners.error')}
          retryLabel={t('common.retry')}
          onRetry={() => setAttempt((n) => n + 1)}
        />
      ) : items.length ? (
        items.map((p) => (
          <Card key={p.id}>
            <AppText variant="caption" tone="muted">
              {t(`partners.${p.kind}`)} ·{' '}
              {t(`partners.${p.publication_status}`)}
            </AppText>
            <Button testID={'wallet-open-'+p.id} label={financeText(locale,'wallet')} variant="secondary" onPress={()=>wallet(p.id)}/>
            <Button label={p.name} variant="link" onPress={() => open(p.id)} />
            <AppText>
              {t(p.accepting_jobs ? 'partners.accepting' : 'partners.paused')}
            </AppText>
            <Button
              label={t('partners.manage')}
              variant="secondary"
              onPress={() => open(p.id)}
            />
          </Card>
        ))
      ) : (
        <AppText>{t('partners.empty')}</AppText>
      )}
      <Card>
        {!state.user?.phone_verified && (
          <AppText>{t('partners.verifyNeeded')}</AppText>
        )}
        <Button
          testID="partner-create-open"
          label={t('partners.create')}
          disabled={busy || state.busy || !state.user?.phone_verified}
          onPress={() => open()}
        />
      </Card>
    </>
  );
}
