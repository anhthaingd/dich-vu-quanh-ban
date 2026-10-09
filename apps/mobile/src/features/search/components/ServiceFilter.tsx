import { type ReactNode, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View, StyleSheet } from 'react-native';
import { useCatalogApi } from '../../../app/providers/AppProviders';
import { useLocale } from '../../../app/providers/LocaleProvider';
import { Icon, type IconName } from '../../../components/ui/Icon';
import { AppText } from '../../../components/ui/AppText';
import { Button } from '../../../components/ui/Button';
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/Feedback';
import type { Category, Skill } from '../../catalog/models/catalog.types';
import { theme } from '../../../theme/tokens';
export type ServiceSelection = { categoryId?: string; skillId?: string };

// Stable catalog codes keep the same visual identity in every language.
const industryIcons = new Map<string, IconName>([
  ['home_utilities', 'wrench'],
  ['hvac_appliances', 'airVent'],
  ['cleaning', 'sprayCan'],
  ['digital_repair', 'laptop'],
  ['vehicle_care', 'car'],
  ['pet_care', 'pawPrint'],
  ['beauty', 'scissors'],
  ['moving', 'truck'],
  ['laundry', 'washingMachine'],
  ['installation_it', 'router'],
]);

// Keep IDs as filters. Names come from the catalog in the current locale.
export function ServiceFilter({ value, onChange, locationControl, submitControl }: {
  locationControl?: ReactNode; submitControl?: ReactNode;
  value: ServiceSelection; onChange: (value: ServiceSelection) => void;
}) {
  const api = useCatalogApi(), { t, locale } = useLocale();
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<{locale: string; items: Skill[]} | null>(null);
  const [queryError, setQueryError] = useState(false);
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
  useEffect(() => {
    if (!opened || !query.trim() || !tree || tree.locale !== locale) return;
    const controller = new AbortController();
    setMatches(null); setQueryError(false);
    Promise.all(tree.items.filter(c => !c.parent_id).map(c => api.skills(c.id, controller.signal, locale)))
      .then(lists => { if (!controller.signal.aborted) setMatches({locale, items: [...new Map(lists.flat().map(s => [s.id, s])).values()]}); })
      .catch(() => { if (!controller.signal.aborted) setQueryError(true); });
    return () => controller.abort();
  }, [api, tree, locale, opened, !!query.trim(), retry]);
  const categories = tree?.locale === locale ? tree.items : [];
  const skills = services?.locale === locale && services.categoryId === categoryId ? services.items : [];
  const selectedCategory = categories.find(item => item.id === value.categoryId);
  const selectedSkill = categoryId === value.categoryId ? skills.find(item => item.id === value.skillId) : undefined;
  const current = categories.find(item => item.id === browse);
  const children = categories.filter(item => item.parent_id === (browse ?? null));
  const directSkills = skills.filter(item => item.category_ids.includes(browse!));
  const ready = tree?.locale === locale && services?.locale === locale && services.categoryId === categoryId;
  const normalize = (text: string) => text.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const filtered = matches?.locale === locale ? matches.items.filter(item => normalize(item.name).includes(normalize(query.trim()))) : [];
  const selectedName = value.skillId ? selectedSkill?.name ?? t('serviceFilter.selected') : selectedCategory?.name;
  // Presentation order from the approved Storybook; unknown industries remain available.
  const order = ['home_utilities','hvac_appliances','cleaning','digital_repair','vehicle_care','pet_care','beauty','moving','laundry','installation_it'];
  const industries = categories.filter(c=>!c.parent_id).sort((a,b)=>(order.includes(a.code)?order.indexOf(a.code):order.length)-(order.includes(b.code)?order.indexOf(b.code):order.length));
  const selectedRoot = selectedCategory?.parent_id ?? value.categoryId;
  const open = () => { setQuery(''); setBrowse(value.categoryId); setOpened(true); };
  const choose = (selection: ServiceSelection) => {onChange(selection); setOpened(false);};
  return <View style={{gap:theme.spacing.sm}}>
    <View aria-hidden={opened} accessibilityElementsHidden={opened} importantForAccessibility={opened ? 'no-hide-descendants' : 'auto'} style={{gap:theme.spacing.sm}}>
    {locationControl ? <>
      <View style={styles.searchBar}>
        <View style={styles.searchRow}>
          <Pressable testID="search-service-open" accessibilityRole="button" accessibilityLabel={t('serviceFilter.choose')} onPress={open} style={styles.searchInput}>
            <Icon name="search" size={21} /><AppText testID="search-service-selected" numberOfLines={1} style={styles.searchText} tone={selectedName ? 'text' : 'muted'}>{selectedName ?? t('home.placeholder')}</AppText>
          </Pressable>
          {submitControl}
        </View>
        {locationControl}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}><View style={styles.categories}>
        {[{id:'',code:'',name:t('home.all')},...industries].map(item => <Pressable key={item.id} testID={`home-category-${item.id || 'all'}`} accessibilityRole="button" accessibilityLabel={item.name} accessibilityState={{selected:(selectedRoot??'')===item.id}}
          onPress={()=>choose(item.id ? {categoryId:item.id} : {})} style={[styles.category, (selectedRoot??'')===item.id && styles.selected]}>
          <View style={[styles.categoryIcon,(selectedRoot??'')===item.id && styles.selectedIcon]}><Icon name={industryIcons.get(item.code) ?? 'grid'} size={24} color={(selectedRoot??'')===item.id ? '#fff' : '#526987'} /></View>
          <AppText style={styles.categoryText} tone={(selectedRoot??'')===item.id ? 'primary' : 'muted'}>{item.name}</AppText>
        </Pressable>)}
      </View></ScrollView>
      {treeError ? <ErrorState message={t('catalog.error')} retryLabel={t('common.retry')} onRetry={()=>setRetry(n=>n+1)}/> : !tree ? <LoadingState message={t('catalog.loading')}/> : categories.length===0 ? <EmptyState message={t('catalog.empty')}/> : null}
      {categories.some(c=>c.name_locale!==locale) && <AppText variant="caption" tone="muted">{t('catalog.translationNotice')}</AppText>}
    </> : <>
      <AppText variant="section">{t('serviceFilter.title')}</AppText>
      <AppText testID="search-service-selected">{selectedName ?? t('serviceFilter.all')}</AppText>
      <Button testID="search-service-open" variant="secondary" label={t('serviceFilter.choose')} onPress={open} />
    </>}
    </View>
    {opened && <Modal visible animationType="slide" onRequestClose={()=>setOpened(false)}>
      <View style={{flex:1,paddingTop:40,backgroundColor:theme.colors.surface}}>
        <ScrollView contentContainerStyle={{padding:16,gap:12,paddingBottom:24}}>
          <AppText variant="title">{t('serviceFilter.choose')}</AppText>
          <AppText tone="muted">{t('home.searchCatalogHint')}</AppText>
          <TextInput testID="service-query" accessibilityLabel={t('home.searchServices')} placeholder={t('home.placeholder')} value={query} onChangeText={setQuery} style={styles.query} />
          {query.trim() ? <>
            {queryError || treeError ? <ErrorState message={t('catalog.error')} retryLabel={t('common.retry')} onRetry={()=>setRetry(n=>n+1)}/> : !matches ? <LoadingState message={t('catalog.loading')}/> : <>
              {filtered.map(item=><Button key={item.id} testID={`service-match-${item.id}`} label={item.name} variant="secondary" onPress={()=>choose({categoryId:item.category_ids[0],skillId:item.id})}/>)}
              {!filtered.length && <EmptyState message={t('catalog.empty')}/>}
            </>}
          </> : <>
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
          </>}
        </ScrollView>
        <View style={{padding:16,paddingBottom:28}}><Button testID="service-cancel" variant="secondary" label={t('accountTools.cancel')} onPress={()=>setOpened(false)} /></View>
      </View>
    </Modal>}
  </View>;
}

const styles = StyleSheet.create({
 searchBar:{borderWidth:1,borderColor:'#D5DEF2',borderRadius:13,padding:6,gap:4},
 searchRow:{flexDirection:'row',alignItems:'center',gap:4},
 searchInput:{flex:1,flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:10,minHeight:46},
 searchText:{fontSize:12,lineHeight:20,flex:1},
 categoryScroll:{marginRight:-16},
 categories:{width:443,flexDirection:'row',flexWrap:'wrap',paddingTop:20,paddingBottom:18,gap:7},
 category:{width:68,alignItems:'center',gap:8,paddingHorizontal:2,paddingVertical:8,borderRadius:8},
 selected:{backgroundColor:'#EFF3FB'},
 categoryIcon:{width:44,height:44,borderRadius:13,backgroundColor:'#E6EEFA',alignItems:'center',justifyContent:'center'},
 selectedIcon:{backgroundColor:theme.colors.primary},
 categoryText:{fontSize:10,lineHeight:15,textAlign:'center'},
 query:{borderWidth:1,borderColor:theme.colors.border,padding:12,borderRadius:12,fontFamily:'BeVietnam',fontSize:14,color:theme.colors.text},
});
