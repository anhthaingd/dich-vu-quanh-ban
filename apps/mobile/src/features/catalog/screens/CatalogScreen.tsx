import { useLocale } from '../../../app/providers/LocaleProvider';
import { LanguageSettings } from '../../accounts/components/LanguageSettings';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../app/navigation/routes';
import { useCatalogApi } from '../../../app/providers/AppProviders';
import { AppText } from '../../../components/ui/AppText';
import { Button } from '../../../components/ui/Button';
import { ActionCard } from '../../../components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/Feedback';
import { Screen } from '../../../components/ui/Screen';
import { theme } from '../../../theme/tokens';
import { diagnostics } from '../../../lib/logging/logger';
import type { Category, Skill } from '../models/catalog.types';

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; categories: Category[]; skills: Skill[] };
type Props = NativeStackScreenProps<RootStackParamList, 'CatalogHome' | 'CatalogCategory'>;
export function CatalogScreen({ route, navigation }: Props) {
  const { t, locale } = useLocale();
  const api = useCatalogApi();
  const selectedId = route.params?.categoryId;
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<State>({ kind: 'loading' });

  // Stack screens stay mounted: cancel on blur as well as unmount, and refresh
  // on return so inactive catalog items are not shown from stale state.
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setState({ kind: 'loading' });
    Promise.all([api.categories(selectedId, controller.signal), selectedId ? api.skills(selectedId, controller.signal) : Promise.resolve([])])
      .then(([categories, skills]) => { if (!controller.signal.aborted) setState({ kind: 'ready', categories, skills }); })
      .catch(() => { if (!controller.signal.aborted) setState({ kind: 'error' }); });
    return () => controller.abort();
  }, [api, selectedId, retry]));

  return <Screen>
    <AppText variant="brand" tone="primary">DỊCH VỤ QUANH BẠN</AppText>
    {!selectedId && <Button testID="nav-account" label={t('common.account')} variant="link" onPress={() => navigation.navigate('Account')} />}
    {navigation.canGoBack() && <Button testID="nav-back" label={t('common.backButton')} accessibilityLabel={t('common.back')} variant="link" onPress={() => navigation.goBack()} />}
    <AppText accessibilityRole="header" variant="title">{route.params?.nameVi ?? t('catalog.title')}</AppText>
    <AppText tone="muted" style={styles.subtitle}>{t(selectedId ? 'catalog.categorySubtitle' : 'catalog.subtitle')}</AppText>
    <LanguageSettings />
    {locale !== 'vi' && <AppText variant="caption" tone="muted">{t('catalog.translationNotice')}</AppText>}
    {state.kind === 'loading' && <LoadingState message={t('catalog.loading')} />}
    {state.kind === 'error' && <ErrorState message={t('catalog.error')} retryLabel={t('common.retry')}
      onRetry={() => { diagnostics.emit('request.retry'); setRetry(n => n + 1); }} />}
    {state.kind === 'ready' && <>
      {state.categories.length === 0 && state.skills.length === 0 && <EmptyState message={t('catalog.empty')} />}
      {state.categories.map(category => <ActionCard key={category.id} title={category.name_vi} actionLabel={t('catalog.viewServices')}
        onPress={() => navigation.navigate('CatalogCategory', { categoryId: category.id, nameVi: category.name_vi })} />)}
      {state.skills.length > 0 && <AppText accessibilityRole="header" variant="section" style={styles.section}>{t('catalog.skills', { count: state.skills.length })}</AppText>}
      {state.skills.map(skill => <View key={skill.id} style={styles.skill}>
        <View style={styles.dot} /><AppText style={styles.skillText}>{skill.name_vi}</AppText>
      </View>)}
    </>}
  </Screen>;
}
const styles = StyleSheet.create({
  subtitle: { marginBottom: theme.spacing.lg },
  section: { marginTop: theme.spacing.panel },
  skill: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.lg, gap: theme.spacing.md, borderBottomWidth: 1, borderColor: theme.colors.border },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary },
  skillText: { flex: 1 },
});
