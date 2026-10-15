import { LocationField } from '../../location/components/LocationField';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore
} from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../app/navigation/routes';
import {
  usePartnersApi
} from '../../../app/providers/AppProviders';
import { useAuth } from '../../../app/providers/AuthProvider';
import { useLocale } from '../../../app/providers/LocaleProvider';
import { ProductShell } from '../../../app/layout/ProductShell';
import { Icon } from '../../../components/ui/Icon';
import { AppText } from '../../../components/ui/AppText';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import {
  LoadingState,
  ErrorState,
  EmptyState
} from '../../../components/ui/Feedback';
import {
  coordinateNumber,
  Options
} from '../../partners/components/PartnerFields';
import { PartnerSearch } from '../state/partner-search';
import { ServiceFilter, type ServiceSelection } from '../components/ServiceFilter';
import { SearchResultsMap } from '../components/SearchResultsMap';
import type { Mode, Point } from '../../partners/models';
import type { SavedAddress } from '../../accounts/models';
import { theme } from '../../../theme/tokens';
export function SearchScreen({
  navigation,
  route
}: NativeStackScreenProps<RootStackParamList, 'Search' | 'CatalogHome'>) {
  const api = usePartnersApi(),
    { t } = useLocale(),
    { state: auth } = useAuth();
  const search = useMemo(() => new PartnerSearch(api), [api]);
  const state = useSyncExternalStore(
    search.subscribe,
    search.getSnapshot,
    search.getSnapshot
  );
  const [placeText, setPlaceText] = useState('');
  const [mapView,setMapView]=useState(false);
  const [lat, setLat] = useState(''),
    [lng, setLng] = useState(''),
    [radius, setRadius] = useState('10000'),
    [mode, setMode] = useState<Mode>('at_customer'),
    [anyMode, setAnyMode] = useState(true),
    [verified, setVerified] = useState(false),
    [invalid, setInvalid] = useState(false);
  const [service, setService] = useState<ServiceSelection>(route.params ?? {});
  const [filtersOpen, setFiltersOpen] = useState(false);
  useFocusEffect(useCallback(() => () => search.cancel(), [search]));
  useEffect(() => {
    setService({categoryId:route.params?.categoryId,skillId:route.params?.skillId});
  }, [route.params?.categoryId, route.params?.skillId]);
  useEffect(() => { search.reset(); }, [search, lat, lng, service.categoryId, service.skillId, radius, mode, anyMode, verified]);
  useEffect(() => { setLat(''); setLng(''); setPlaceText(''); }, [auth.user?.id]);
  const choose = (p: Point, text = '') => {
    setPlaceText(text);
    setLat(String(p.latitude));
    setLng(String(p.longitude));
  };
  const submit = () => {
    const latitude = coordinateNumber(lat),
      longitude = coordinateNumber(lng),
      radius_m = coordinateNumber(radius);
    if (
      !Number.isFinite(latitude) ||
      Math.abs(latitude) > 90 ||
      !Number.isFinite(longitude) ||
      Math.abs(longitude) > 180 ||
      !Number.isSafeInteger(radius_m) ||
      radius_m < 1 ||
      radius_m > 2147483647
    ) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    void search.search({
      latitude,
      longitude,
      radius_m,
      skill_id: service.skillId,
      category_id: service.categoryId,
      service_mode: anyMode ? undefined : mode,
      verified
    });
  };
  return (
    <ProductShell
      keyboardDismissMode="on-drag"
      discovery
      onBack={route.name === 'Search' ? () => navigation.goBack() : undefined}
      onJobs={() => navigation.navigate('Jobs')}
      onNotifications={() => navigation.navigate('Notifications')} onMessages={() => navigation.navigate('Conversations')}
      onAccount={() => navigation.navigate('Account')}
      onCatalog={() => navigation.popTo('CatalogHome')}
    >
      <View style={styles.intro}>
        <AppText style={styles.eyebrow}>{t('home.eyebrow')}</AppText>
        <AppText variant="title" accessibilityRole="header" style={styles.headline}>{t('home.headline')}{'\n'}<AppText style={styles.headline} tone="primary">{t('home.headlineAccent')}</AppText></AppText>
        <AppText tone="muted" style={styles.introCopy}>{t('home.intro')}</AppText>
      </View>
      <ServiceFilter value={service} onChange={setService}
        submitControl={<Pressable testID="search-submit" accessibilityRole="button" accessibilityLabel={t('search.submit')} onPress={submit} style={styles.submit}><Icon name="search" color="#fff" size={21}/></Pressable>}
        locationControl={<LocationField text={placeText} onChange={v=>{choose(v.point);setPlaceText(v.text);}} radius={Number(radius)} prefix="search" lat={lat} lng={lng}
          renderTrigger={open=><Pressable testID="search-pick-location" accessibilityRole="button" accessibilityLabel={t('location.open')} onPress={open} style={styles.location}>
            <Icon name="pin" size={20} color={theme.colors.primary}/><AppText tone="muted" style={styles.locationLabel}>{t('home.area')}</AppText><AppText numberOfLines={1} style={styles.locationValue}>{placeText || t('home.chooseArea')}</AppText>
          </Pressable>}/>} />
      <View style={styles.filters}>
        <Pressable testID="search-filters-open" accessibilityRole="button" accessibilityLabel={t('home.filters')} onPress={()=>setFiltersOpen(true)} style={styles.filterButton}><Icon name="filters" size={16}/><AppText style={styles.small}>{t('home.radius',{km:Number(radius)/1000})}</AppText><Icon name="down" size={14}/></Pressable>
        <Pressable testID="search-verified" accessibilityRole="checkbox" accessibilityState={{checked:verified}} onPress={()=>setVerified(v=>!v)} style={styles.verified}>
          <View style={[styles.checkbox, verified && styles.checked]}>{verified && <AppText style={styles.checkMark} tone="surface">✓</AppText>}</View><AppText style={styles.small}>{t('search.verified')}</AppText>
        </Pressable>
      </View>
      {invalid && <AppText accessibilityRole="alert" tone="error" style={styles.notice}>{t('search.invalid')}</AppText>}
      {filtersOpen && <Modal visible animationType="slide" onRequestClose={()=>setFiltersOpen(false)}>
      <View style={styles.filterModal}><ScrollView contentContainerStyle={styles.filterContent}>
        <AppText variant="title">{t('home.filters')}</AppText>
        <Input
          testID="search-radius"
          label={t('search.radius')}
          value={radius}
          onChangeText={setRadius}
          keyboardType="number-pad"
        />
        {auth.phase === 'authenticated' && auth.user && (
          <SavedPositions
            key={auth.user.id}
            owner={auth.user.id}
            choose={choose}
          />
        )}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md
          }}
        >
          <Switch
            accessibilityLabel={t('search.allModes')}
            value={anyMode}
            onValueChange={setAnyMode}
          />
          <AppText>{t('search.allModes')}</AppText>
        </View>
        {!anyMode && (
          <Options
            values={['at_shop', 'at_customer', 'custom']}
            value={mode}
            onChange={setMode}
            testID="search-mode"
          />
        )}
      </ScrollView><Button testID="search-filters-apply" label={t('home.apply')} onPress={()=>setFiltersOpen(false)}/></View>
      </Modal>}
      {!state.searched && !state.busy && !state.error && <View style={styles.empty}><AppText style={styles.resultTitle}>{t('home.start')}</AppText><AppText style={styles.small} tone="muted">{t('home.startHint')}</AppText></View>}
      {state.busy && <LoadingState message={t('search.loading')} />}
      {state.error && (
        <ErrorState
          message={t('search.error')}
          retryLabel={t('common.retry')}
          onRetry={() => void search.retry()}
        />
      )}
      {state.searched && !state.busy && !state.error && !state.items.length && (
        <EmptyState message={t('search.empty')} />
      )}
      {state.searched && <>
        <View style={styles.resultHeader}><View style={{flex:1,gap:4}}><AppText accessibilityRole="header" style={styles.resultTitle}>{t(state.next ? 'home.resultsMore' : 'home.results',{count:state.items.length})}</AppText><AppText style={styles.small} tone="muted">{t('home.radius',{km:Number(radius)/1000})} · {placeText}</AppText></View>
          <Pressable testID={mapView?'search-view-list':'search-view-map'} accessibilityRole="button" accessibilityLabel={t(mapView?'searchMap.list':'searchMap.map')} onPress={()=>setMapView(v=>!v)} style={styles.mapButton}><Icon name="map" size={17}/><AppText style={styles.small}>{t(mapView?'searchMap.list':'searchMap.map')}</AppText></Pressable>
        </View><AppText style={styles.sort} tone="muted">{t('home.nearest')}</AppText>
      </>}
      {mapView && state.searched && state.criteria && <SearchResultsMap
        key={`${state.criteria.latitude},${state.criteria.longitude},${state.criteria.radius_m},${state.criteria.service_mode},${state.criteria.verified},${state.criteria.skill_id},${state.criteria.category_id}`}
        items={state.items} center={state.criteria} hasMore={!!state.next} openProfile={id=>navigation.navigate('PartnerProfile',{id})} />}
      {state.items.filter(p=>!mapView || !p.map_location).map((p) => (
        <View key={p.id} testID={`search-result-${p.id}`} style={styles.provider}>
          <Pressable accessibilityRole="button" accessibilityLabel={`${t('search.view')} · ${p.name}`} onPress={()=>navigation.navigate('PartnerProfile',{id:p.id})} style={styles.providerName}>
            <AppText style={styles.providerTitle}>{p.name}</AppText><Icon name="arrow" size={16}/>
          </Pressable>
          <AppText style={styles.small} tone="muted">{t(`partners.${p.kind}`)} · {t(p.distance_kind === 'shop' ? 'search.distanceShop' : 'search.distanceArea', {distance:(p.distance_m/1000).toFixed(1)})}</AppText>
          <View style={styles.reputation}><AppText style={styles.small} tone="muted">{p.stars===null ? t('home.noReviews') : t('home.reviews',{stars:p.stars,count:p.review_count})}</AppText><AppText style={styles.small} tone={p.verification_status==='verified'?'success':'muted'}>{t(p.verification_status==='verified'?'partners.verified':'partners.unverified')}</AppText></View>
          <View style={styles.providerBottom}><View style={{flex:1,gap:4}}><AppText tone="muted" style={styles.small}>{t('home.priceLabel')}</AppText><AppText style={styles.price}>{p.reference_labor===null?t('search.noPrice'):t('search.price',{price:new Intl.NumberFormat('vi-VN').format(Number(p.reference_labor))})}</AppText></View>
            <Button label={t('search.view')} variant="secondary" onPress={()=>navigation.navigate('PartnerProfile',{id:p.id})}/>
          </View>
        </View>
      ))}
      {state.items.length>0 && <AppText style={styles.notice} tone="muted">{t('home.priceHint')}</AppText>}
      {state.next && (
        <Button
          testID="search-more"
          label={t('search.more')}
          disabled={state.busy}
          onPress={() => void search.more()}
        />
      )}
    </ProductShell>
  );
}
function SavedPositions({
  owner,
  choose
}: {
  owner: string;
  choose: (p: Point, text?: string) => void;
}) {
  const { manager, state } = useAuth(),
    { t } = useLocale();
  const [items, setItems] = useState<SavedAddress[]>([]),
    [next, setNext] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const load = async (more = false) => {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const page = await manager.listAddresses(
        owner,
        more ? (next ?? undefined) : undefined
      );
      setItems((v) => (more ? [...v, ...page.items] : page.items));
      setNext(page.next_cursor);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button
        testID="search-saved-addresses"
        label={t('search.savedAddresses')}
        variant="secondary"
        disabled={busy || state.busy}
        onPress={() => void load()}
      />
      {error && <AppText tone="error">{t('accountTools.error')}</AppText>}
      {items.map((a) => (
        <Button
          key={a.id}
          label={a.label}
          variant="link"
          onPress={() => choose(a.address.point, a.address.text)}
        />
      ))}
      {next && (
        <Button
          label={t('search.more')}
          disabled={busy || state.busy}
          onPress={() => void load(true)}
        />
      )}
    </>
  );
}

const styles=StyleSheet.create({
 intro:{marginBottom:24},eyebrow:{fontSize:8,lineHeight:14,fontWeight:'700',letterSpacing:1,color:'#58657A',marginBottom:14},
 headline:{fontSize:28,lineHeight:38,fontWeight:'700',letterSpacing:-1.1},introCopy:{fontSize:12,lineHeight:22,maxWidth:320,marginTop:14},
 submit:{width:46,height:46,borderRadius:11,backgroundColor:theme.colors.primary,alignItems:'center',justifyContent:'center'},
 location:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:10,minHeight:40,borderTopWidth:1,borderColor:'#E1E6EE'},locationLabel:{fontSize:10,lineHeight:16},locationValue:{fontSize:12,lineHeight:18,fontWeight:'600',flex:1},
 filters:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:12,paddingBottom:22},filterButton:{flexDirection:'row',alignItems:'center',gap:6,borderWidth:1,borderColor:'#DEE5F0',borderRadius:8,minHeight:40,paddingHorizontal:10},
 verified:{flexDirection:'row',alignItems:'center',gap:6,minHeight:40},checkbox:{width:16,height:16,borderWidth:1,borderColor:'#78869E',borderRadius:3},checked:{backgroundColor:theme.colors.primary,borderColor:theme.colors.primary},checkMark:{fontSize:12,lineHeight:14,textAlign:'center'},
 small:{fontSize:11,lineHeight:18},notice:{fontSize:11,lineHeight:20,marginVertical:12},filterModal:{flex:1,padding:20,paddingTop:48,paddingBottom:32,backgroundColor:'#fff'},filterContent:{gap:16,paddingBottom:24},
 empty:{gap:8,paddingVertical:24,borderTopWidth:1,borderColor:theme.colors.border},resultHeader:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:20},resultTitle:{fontSize:20,lineHeight:28,fontWeight:'700'},mapButton:{flexDirection:'row',gap:8,alignItems:'center',padding:12,borderWidth:1,borderColor:theme.colors.border,borderRadius:8},sort:{fontSize:11,lineHeight:18,textAlign:'right',marginBottom:12},
 provider:{paddingVertical:20,borderBottomWidth:1,borderColor:theme.colors.border,gap:10},providerName:{flexDirection:'row',alignItems:'center',gap:8},providerTitle:{fontSize:18,lineHeight:26,fontWeight:'700',flex:1},reputation:{flexDirection:'row',flexWrap:'wrap',gap:12},providerBottom:{flexDirection:'row',alignItems:'center',gap:12,marginTop:8},price:{fontSize:18,lineHeight:26,fontWeight:'700'},
});
