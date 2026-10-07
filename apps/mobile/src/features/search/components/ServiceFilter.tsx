import { useEffect, useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { useCatalogApi } from '../../../app/providers/AppProviders';
import { useLocale } from '../../../app/providers/LocaleProvider';
import { AppText } from '../../../components/ui/AppText';
import { Button } from '../../../components/ui/Button';
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/Feedback';
import type { Category, Skill } from '../../catalog/models/catalog.types';
import { theme } from '../../../theme/tokens';
export type ServiceSelection = { categoryId?: string; skillId?: string };

// Keep IDs as filters. Names come from the catalog in the current locale.
export function ServiceFilter({ value, onChange }: {
  value: ServiceSelection; onChange: (value: ServiceSelection) => void;
}) {
  const api = useCatalogApi(), { t, locale } = useLocale();
  const [opened, setOpened] = useState(false);
  const [browse, setBrowse] = useState(value.categoryId);
  const [retry, setRetry] = useState(0);
  const [tree, setTree] = useState<{locale: string; items: Category[]} | null>(null);
  const [services, setServices] = useState<{locale: string; categoryId?: string; items: Skill[]} | null>(null);
  const [treeError, setTreeError] = useState(false), [skillError, setSkillError] = useState(false);
  const categoryId = opened ? browse : value.categoryId;
  // The current catalog has industry → group. Load category labels once per locale;
  // skill lists are loaded only for the category being viewed.
  useEffect(() => {
    const controller = new AbortController();
    setTree(null); setTreeError(false);
    api.categories(undefined, controller.signal, locale).then(async roots => {
      const groups = await Promise.all(roots.map(root => api.categories(root.id, controller.signal, locale)));
      if (!controller.signal.aborted) setTree({locale,items:[...new Map([...roots,...groups.flat()].map(item=>[item.id,item])).values()]});
    }).catch(() => {if (!controller.signal.aborted) setTreeError(true);});
    return () => controller.abort();
  }, [api, locale, retry]);
  useEffect(() => {
    const controller = new AbortController();
    setServices(null); setSkillError(false);
    (categoryId ? api.skills(categoryId, controller.signal, locale) : Promise.resolve([]))
      .then(items => {if (!controller.signal.aborted) setServices({locale,categoryId,items});})
      .catch(() => {if (!controller.signal.aborted) setSkillError(true);});
    return () => controller.abort();
  }, [api, categoryId, locale, retry]);
  const categories = tree?.locale === locale ? tree.items : [];
  const skills = services?.locale === locale && services.categoryId === categoryId ? services.items : [];
  const selectedCategory = categories.find(item => item.id === value.categoryId);
  const selectedSkill = categoryId === value.categoryId ? skills.find(item => item.id === value.skillId) : undefined;
  const current = categories.find(item => item.id === browse);
  const children = categories.filter(item => item.parent_id === (browse ?? null));
  const directSkills = skills.filter(item => item.category_ids.includes(browse!));
  const ready = tree?.locale === locale && services?.locale === locale && services.categoryId === categoryId;
  const choose = (selection: ServiceSelection) => {onChange(selection); setOpened(false);};
  return <View style={{gap:theme.spacing.sm}}>
    <AppText variant="section">{t('serviceFilter.title')}</AppText>
    <AppText testID="search-service-selected">{value.skillId ? selectedSkill?.name ?? t('serviceFilter.selected') : value.categoryId ? selectedCategory?.name ?? t('serviceFilter.selected') : t('serviceFilter.all')}</AppText>
    <Button testID="search-service-open" variant="secondary" label={t('serviceFilter.choose')} onPress={()=>{setBrowse(value.categoryId);setOpened(true);}} />
    {opened && <Modal visible animationType="slide" onRequestClose={()=>setOpened(false)}>
      <View style={{flex:1,paddingTop:40,backgroundColor:theme.colors.surface}}>
        <ScrollView contentContainerStyle={{padding:16,gap:12,paddingBottom:24}}>
          <AppText variant="title">{t('serviceFilter.choose')}</AppText>
          <AppText tone="muted">{t('serviceFilter.hint')}</AppText>
          <Button testID="service-all" variant="secondary" label={t('serviceFilter.all')} onPress={()=>choose({})} />
          {browse && <Button testID="service-root" variant="link" label={t('serviceFilter.industries')} onPress={()=>setBrowse(undefined)} />}
          {current?.parent_id && <Button testID="service-parent" variant="link" label={categories.find(item=>item.id===current.parent_id)?.name ?? t('common.back')} onPress={()=>setBrowse(current.parent_id!)} />}
          {treeError || skillError ? <ErrorState message={t('catalog.error')} retryLabel={t('common.retry')} onRetry={()=>setRetry(n=>n+1)} /> : !ready ? <LoadingState message={t('catalog.loading')} /> : <>
            {current && <><AppText variant="section">{current.name}</AppText><Button testID="service-category-apply" label={t('serviceFilter.inCategory',{name:current.name})} onPress={()=>choose({categoryId:current.id})} /></>}
            {children.map(item=><Button key={item.id} testID={`service-category-${item.id}`} label={item.name} variant="secondary" onPress={()=>setBrowse(item.id)} />)}
            {directSkills.map(item=><Button key={item.id} testID={`service-skill-${item.id}`} label={item.name} variant="secondary" accessibilityState={{selected:value.skillId===item.id}} onPress={()=>choose({categoryId:browse,skillId:item.id})} />)}
            {!children.length && !directSkills.length && <EmptyState message={t('catalog.empty')} />}
            {[...children,...directSkills,...(current?[current]:[])].some(item=>item.name_locale!==locale) && <AppText tone="muted">{t('catalog.translationNotice')}</AppText>}
          </>}
        </ScrollView>
        <View style={{padding:16,paddingBottom:28}}><Button testID="service-cancel" variant="secondary" label={t('accountTools.cancel')} onPress={()=>setOpened(false)} /></View>
      </View>
    </Modal>}
  </View>;
}
