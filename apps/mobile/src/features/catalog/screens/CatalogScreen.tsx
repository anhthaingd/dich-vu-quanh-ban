import { useLocale } from '../../../app/providers/LocaleProvider';
import { LanguageSettings } from '../../accounts/components/LanguageSettings';
import { useCallback, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../app/navigation/routes';
import { useCatalogApi } from '../../../app/providers/AppProviders';
import { AppText } from '../../../components/ui/AppText';
import { Button } from '../../../components/ui/Button';
import { ActionCard } from '../../../components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/Feedback';
import { ProductShell } from '../../../app/layout/ProductShell';
import { theme } from '../../../theme/tokens';
import { diagnostics } from '../../../lib/logging/logger';
import type { Category, Skill } from '../models/catalog.types';

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; categories: Category[]; skills: Skill[]; selected?: Category; locale: string };
type Props = NativeStackScreenProps<RootStackParamList, 'CatalogHome' | 'CatalogCategory'>;
export function CatalogScreen({ route, navigation }: Props) {
  const { t, locale } = useLocale();
  const { width, fontScale } = useWindowDimensions();
  const twoColumns = width >= 360 && fontScale < 1.3;
  const api = useCatalogApi();
  const parentId = route.params?.parentId;
  const selectedId = route.params?.categoryId;
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<State>({ kind: 'loading' });

  // Stack screens stay mounted: cancel on blur as well as unmount, and refresh
  // on return so inactive catalog items are not shown from stale state.
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setState({ kind: 'loading' });
    Promise.all([api.categories(selectedId, controller.signal, locale), selectedId ? api.skills(selectedId, controller.signal, locale) : Promise.resolve([]),
      selectedId ? api.categories(parentId ?? undefined, controller.signal, locale) : Promise.resolve([])])
      // The API includes descendant skills. Show only direct memberships here so
      // opening an industry does not repeat every child group's skill list.
      .then(([categories, skills, siblings]) => { if (!controller.signal.aborted) setState({ kind: 'ready', categories, skills: skills.filter(skill => skill.category_ids.includes(selectedId!)), selected: siblings.find(item => item.id === selectedId), locale }); })
      .catch(() => { if (!controller.signal.aborted) setState({ kind: 'error' }); });
    return () => controller.abort();
  }, [api, selectedId, parentId, retry, locale]));

  return <ProductShell onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
    onAccount={() => navigation.navigate('Account')} onCatalog={() => navigation.popTo('CatalogHome')}>
    <View style={styles.intro}>
    {!selectedId && <AppText variant="brand" tone="primary">{t('shell.discover')}</AppText>}
    <AppText accessibilityRole="header" variant="title">{state.kind === 'ready' && state.locale === locale && state.selected ? state.selected.name : t('catalog.title')}</AppText>
    <AppText tone="muted" style={styles.subtitle}>{t(selectedId ? 'catalog.categorySubtitle' : 'catalog.subtitle')}</AppText>
    </View>
    <LanguageSettings />
    <Button testID="search-open" label={t('search.title')} variant="secondary" onPress={() => navigation.navigate('Search', {categoryId:selectedId})} />
    {state.kind === 'ready' && state.locale === locale && [...state.categories, ...state.skills, ...(state.selected ? [state.selected] : [])].some(item => item.name_locale !== locale) && <AppText variant="caption" tone="muted">{t('catalog.translationNotice')}</AppText>}
    {state.kind === 'loading' && <LoadingState message={t('catalog.loading')} />}
    {state.kind === 'error' && <ErrorState message={t('catalog.error')} retryLabel={t('common.retry')}
      onRetry={() => { diagnostics.emit('request.retry'); setRetry(n => n + 1); }} />}
    {state.kind === 'ready' && state.locale === locale && <>
      {state.categories.length === 0 && state.skills.length === 0 && <EmptyState message={t('catalog.empty')} />}
      {state.categories.length > 0 && <>
        <AppText variant="section" accessibilityRole="header">{t(selectedId ? 'shell.groups' : 'shell.categories')}</AppText>
        <View style={styles.grid}>
          {state.categories.map(category => <View key={category.id} style={twoColumns ? styles.half : styles.full}>
            <ActionCard title={category.name} actionLabel={t('catalog.viewServices')}
              onPress={() => navigation.navigate('CatalogCategory', { categoryId: category.id, parentId: category.parent_id })} />
          </View>)}
        </View>
      </>}
      {state.skills.length > 0 && <AppText accessibilityRole="header" variant="section" style={styles.section}>{t('catalog.skills', { count: state.skills.length })}</AppText>}
      {state.skills.map(skill => <View key={skill.id} style={styles.skill}>
        <View style={styles.skillText}><Button label={skill.name} variant="link" onPress={() => navigation.navigate('Search', {skillId:skill.id,categoryId:selectedId})} /></View>
      </View>)}
    </>}
  </ProductShell>;
}
const styles = StyleSheet.create({
  intro: { gap: theme.spacing.sm, paddingVertical: theme.spacing.lg },
  subtitle: { marginBottom: theme.spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: theme.spacing.md },
  half: { width: '48%' },
  full: { width: '100%' },
  section: { marginTop: theme.spacing.panel },
  skill: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.lg, gap: theme.spacing.md, borderBottomWidth: 1, borderColor: theme.colors.border },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary },
  skillText: { flex: 1 },
});
