import type { ReactNode } from 'react';
import { ProductShell } from '../../../app/layout/ProductShell';
import { useAuth } from '../../../app/providers/AuthProvider';
import { useLocale } from '../../../app/providers/LocaleProvider';
import { AppText } from '../../../components/ui/AppText';
import { Button } from '../../../components/ui/Button';
import { LoadingState } from '../../../components/ui/Feedback';
import { Card } from '../../../components/ui/Card';
import { LanguageSettings } from './LanguageSettings';
export function AccountPage({ title, back, login, children }: { title: 'invoice.title' | 'addresses.title' | 'sessions.title' | 'partners.title' | 'jobs.title' | 'jobs.create' | 'jobs.detail' | 'chat.title'; back: () => void; login: () => void; children: (owner: string) => ReactNode }) {
  const { manager, state } = useAuth(); const { t } = useLocale();
  return <ProductShell keyboardDismissMode="on-drag" onBack={back}>
    <AppText variant={title === 'partners.title' ? 'section' : 'title'} accessibilityRole="header">{t(title)}</AppText>
    {state.phase === 'authenticated' && state.user ? <>
      {title !== 'partners.title' && title !== 'invoice.title' && <Card><LanguageSettings /></Card>}{children(state.user.id)}{(title === 'partners.title' || title === 'invoice.title') && <Card><LanguageSettings /></Card>}
    </> : state.phase === 'loading' ? <LoadingState message={t('auth.restoring')} />
      : state.phase === 'restore-error' ? <Card><AppText tone="error">{t('errors.session')}</AppText><Button label={t('common.retry')} disabled={state.busy} onPress={() => void manager.restore()} /></Card>
      : <Card><AppText>{t('accountTools.signedOut')}</AppText><Button testID="account-continue-login" label={t('auth.login')} onPress={login} /></Card>}
  </ProductShell>;
}
