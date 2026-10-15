import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { Platform, RefreshControl } from 'react-native';
import { theme } from '../../../theme/tokens';
import { ProductShell, type ShellProps } from '../../../app/layout/ProductShell';
import { useAuth } from '../../../app/providers/AuthProvider';
import { useLocale } from '../../../app/providers/LocaleProvider';
import { AppText } from '../../../components/ui/AppText';
import { Button } from '../../../components/ui/Button';
import { LoadingState } from '../../../components/ui/Feedback';
import { Card } from '../../../components/ui/Card';
import { LanguageSettings } from './LanguageSettings';
type Refresh = { refreshing: boolean; onRefresh: () => boolean; enabled: boolean } | null;
const RefreshContext = createContext<Dispatch<SetStateAction<Refresh>>>(() => {});
// Register on the existing page ScrollView, never nest another scroll container.
export function useAccountRefresh(refreshing: boolean, onRefresh: () => boolean, enabled = true) {
  const setRefresh = useContext(RefreshContext), latest = useRef(onRefresh);
  latest.current = onRefresh;
  useEffect(() => {
    setRefresh({ refreshing, enabled, onRefresh: () => latest.current() });
    return () => setRefresh(null);
  }, [setRefresh, refreshing, enabled]);
}
export function AccountPage({ title, back, login, children, shell }: { shell?: ShellProps; title: 'notices.title' | 'notices.settings' | 'team.title' | 'team.verifyTitle' | 'invoice.title' | 'addresses.title' | 'sessions.title' | 'partners.title' | 'jobs.title' | 'jobs.create' | 'jobs.detail' | 'chat.title'; back: () => void; login: () => void; children: (owner: string) => ReactNode }) {
  const [refresh, setRefresh] = useState<Refresh>(null);
  const { manager, state } = useAuth(); const { t } = useLocale();
  return <RefreshContext.Provider value={setRefresh}><ProductShell keyboardDismissMode="on-drag" onBack={back} {...shell}
    refreshControl={Platform.OS !== 'web' && refresh && state.phase === 'authenticated' ? <RefreshControl testID="page-refresh" refreshing={refresh.refreshing} enabled={refresh.enabled || refresh.refreshing} accessibilityState={{busy: !refresh.enabled}} onRefresh={() => { if (refresh.enabled && refresh.onRefresh()) setRefresh({...refresh, refreshing: true}); }} tintColor={theme.colors.primary} colors={[theme.colors.primary]} accessibilityLabel={t('common.refresh')}/> : undefined}>
    <AppText variant={title === 'partners.title' ? 'section' : 'title'} accessibilityRole="header">{t(title)}</AppText>
    {state.phase === 'authenticated' && state.user ? <>
      {title !== 'partners.title' && title !== 'jobs.title' && title !== 'invoice.title' && !title.startsWith('team.') && !title.startsWith('notices.') && <Card><LanguageSettings /></Card>}{children(state.user.id)}{(title === 'partners.title' || title === 'jobs.title' || title === 'invoice.title' || title.startsWith('team.') || title.startsWith('notices.')) && <Card><LanguageSettings /></Card>}
    </> : state.phase === 'loading' ? <LoadingState message={t('auth.restoring')} />
      : state.phase === 'restore-error' ? <Card><AppText tone="error">{t('errors.session')}</AppText><Button label={t('common.retry')} disabled={state.busy} onPress={() => void manager.restore()} /></Card>
      : <Card><AppText>{t('accountTools.signedOut')}</AppText><Button testID="account-continue-login" label={t('auth.login')} onPress={login} /></Card>}
  </ProductShell></RefreshContext.Provider>;
}
