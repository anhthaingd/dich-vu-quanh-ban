import {NavigationContext} from '@react-navigation/native';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { Platform, RefreshControl, type ScrollViewProps } from 'react-native';
import { theme } from '../../../theme/tokens';
import { ProductShell, type ShellProps } from '../../../app/layout/ProductShell';
import { useAuth } from '../../../app/providers/AuthProvider';
import { useLocale } from '../../../app/providers/LocaleProvider';
import { AppText } from '../../../components/ui/AppText';
import { Button } from '../../../components/ui/Button';
import { LoadingState } from '../../../components/ui/Feedback';
import { Card } from '../../../components/ui/Card';
type Refresh = { refreshing: boolean; onRefresh: () => boolean; enabled: boolean } | null;
const RefreshControlContext=createContext<ScrollViewProps['refreshControl']>(undefined);
export const useAccountRefreshControl=()=>useContext(RefreshControlContext);
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
export function AccountPage({ title, back, login, children, shell }: { shell?: ShellProps; title: 'verification.title' | 'support.title' | 'reviews.title' | 'notices.title' | 'notices.settings' | 'team.title' | 'team.verifyTitle' | 'invoice.title' | 'addresses.title' | 'sessions.title' | 'partners.title' | 'jobs.title' | 'jobs.create' | 'jobs.detail' | 'chat.title'; back: () => void; login: () => void; children: (owner: string) => ReactNode }) {
  const navigation=useContext(NavigationContext);
  const [refresh, setRefresh] = useState<Refresh>(null);
  const { manager, state } = useAuth(); const { t } = useLocale();
  const refreshControl=Platform.OS !== 'web' && refresh && state.phase === 'authenticated' ? <RefreshControl testID="page-refresh" refreshing={refresh.refreshing} enabled={refresh.enabled || refresh.refreshing} accessibilityState={{busy: !refresh.enabled}} onRefresh={() => { if (refresh.enabled && refresh.onRefresh()) setRefresh({...refresh, refreshing: true}); }} tintColor={theme.colors.primary} colors={[theme.colors.primary]} accessibilityLabel={t('common.refresh')}/> : undefined;
  return <RefreshControlContext.Provider value={refreshControl}><RefreshContext.Provider value={setRefresh}><ProductShell title={t(title)} keyboardDismissMode="on-drag" onBack={back} onAccount={navigation?()=>navigation.navigate('Account'):undefined} {...shell}
    refreshControl={refreshControl}>
    {state.phase === 'authenticated' && state.user ? children(state.user.id) : state.phase === 'loading' ? <LoadingState message={t('auth.restoring')} />
      : state.phase === 'restore-error' ? <Card><AppText tone="error">{t('errors.session')}</AppText><Button label={t('common.retry')} disabled={state.busy} onPress={() => void manager.restore()} /></Card>
      : <Card><AppText>{t('accountTools.signedOut')}</AppText><Button testID="account-continue-login" label={t('auth.login')} onPress={login} /></Card>}
  </ProductShell></RefreshContext.Provider></RefreshControlContext.Provider>;
}
