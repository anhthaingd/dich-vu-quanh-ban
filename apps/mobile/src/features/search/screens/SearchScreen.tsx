import { LocationField } from '../../location/components/LocationField';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore
} from 'react';
import { Switch, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../app/navigation/routes';
import {
  usePartnersApi,
  useCatalogApi
} from '../../../app/providers/AppProviders';
import { useAuth } from '../../../app/providers/AuthProvider';
import { useLocale } from '../../../app/providers/LocaleProvider';
import { ProductShell } from '../../../app/layout/ProductShell';
import { AppText } from '../../../components/ui/AppText';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
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
import type { Mode, Point } from '../../partners/models';
import type { SavedAddress } from '../../accounts/models';
import { theme } from '../../../theme/tokens';
export function SearchScreen({
  navigation,
  route
}: NativeStackScreenProps<RootStackParamList, 'Search'>) {
  const api = usePartnersApi(),
    catalog = useCatalogApi(),
    { t, locale } = useLocale(),
    { state: auth } = useAuth();
  const search = useMemo(() => new PartnerSearch(api), [api]);
  const state = useSyncExternalStore(
    search.subscribe,
    search.getSnapshot,
    search.getSnapshot
  );
  const [placeText, setPlaceText] = useState('');
  const [lat, setLat] = useState(''),
    [lng, setLng] = useState(''),
    [radius, setRadius] = useState('10000'),
    [mode, setMode] = useState<Mode>('at_customer'),
    [anyMode, setAnyMode] = useState(true),
    [verified, setVerified] = useState(false),
    [invalid, setInvalid] = useState(false),
    [skillName, setSkillName] = useState('');
  useFocusEffect(useCallback(() => () => search.cancel(), [search]));
  useEffect(() => {
    const c = new AbortController();
    if (route.params.categoryId)
      catalog
        .skills(route.params.categoryId, c.signal, locale)
        .then((skills) => {
          if (!c.signal.aborted)
            setSkillName(
              skills.find((s) => s.id === route.params.skillId)?.name ?? ''
            );
        })
        .catch(() => {});
    return () => c.abort();
  }, [catalog, route.params.categoryId, route.params.skillId, locale]);
  useEffect(() => { search.reset(); }, [search, lat, lng]);
  useEffect(() => { setLat(''); setLng(''); setPlaceText(''); }, [auth.user?.id]);
  const choose = (p: Point) => {
    setPlaceText('');
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
      skill_id: route.params.skillId,
      category_id: route.params.categoryId,
      service_mode: anyMode ? undefined : mode,
      verified
    });
  };
  return (
    <ProductShell
      keyboardDismissMode="on-drag"
      onBack={() => navigation.goBack()}
      onAccount={() => navigation.navigate('Account')}
      onCatalog={() => navigation.popTo('CatalogHome')}
    >
      <AppText variant="title" accessibilityRole="header">
        {t('search.title')}
      </AppText>
      {!!skillName && <AppText variant="section">{skillName}</AppText>}
      <AppText tone="muted">{t('search.intro')}</AppText>
      <Card>
        <LocationField
          text={placeText}
          onChange={v => { choose(v.point); setPlaceText(v.text); }}
          radius={Number(radius)}
          prefix="search"
          lat={lat}
          lng={lng}
          changeCoordinate={(key, v) => { setPlaceText(''); if (key === 'lat') setLat(v); else setLng(v); }}
        />
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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md
          }}
        >
          <Switch
            testID="search-verified"
            accessibilityLabel={t('search.verified')}
            value={verified}
            onValueChange={setVerified}
          />
          <AppText>{t('search.verified')}</AppText>
        </View>
        {invalid && (
          <AppText accessibilityRole="alert" tone="error">
            {t('search.invalid')}
          </AppText>
        )}
        <Button
          testID="search-submit"
          label={t('search.submit')}
          onPress={submit}
        />
      </Card>
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
      {state.items.map((p) => (
        <Card key={p.id} testID={`search-result-${p.id}`}>
          <AppText variant="section">{p.name}</AppText>
          <AppText>
            {t(`partners.${p.kind}`)} ·{' '}
            {t(
              p.verification_status === 'verified'
                ? 'partners.verified'
                : 'partners.unverified'
            )}
          </AppText>
          <AppText>
            {t(
              p.distance_kind === 'shop'
                ? 'search.distanceShop'
                : 'search.distanceArea',
              { distance: (p.distance_m / 1000).toFixed(1) }
            )}
          </AppText>
          <AppText>
            {p.reference_labor === null
              ? t('search.noPrice')
              : t('search.price', { price: p.reference_labor })}
          </AppText>
          <Button
            label={t('search.view')}
            onPress={() => navigation.navigate('PartnerProfile', { id: p.id })}
          />
        </Card>
      ))}
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
  choose: (p: Point) => void;
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
          onPress={() => choose(a.address.point)}
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
