import type { ReactNode } from 'react';
import { ProductShell } from '../../../app/layout/ProductShell';
import { useAuth } from '../../../app/providers/AuthProvider';
import { useLocale } from '../../../app/providers/LocaleProvider';
import { AppText } from '../../../components/ui/AppText';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { LanguageSettings } from './LanguageSettings';
export function AccountPage({ title, back, login, children }: { title: 'addresses.title' | 'sessions.title'; back: () => void; login: () => void; children: (owner: string) => ReactNode }) {
  const { state } = useAuth(); const { t } = useLocale();
  return <ProductShell keyboardDismissMode="on-drag" onBack={back}>
    <AppText variant="title" accessibilityRole="header">{t(title)}</AppText>
    {state.phase === 'authenticated' && state.user ? <>
      <Card><LanguageSettings /></Card>{children(state.user.id)}
    </> : <Card><AppText>{t('profile.signedOut')}</AppText><Button label={t('auth.login')} onPress={login} /></Card>}
  </ProductShell>;
}
