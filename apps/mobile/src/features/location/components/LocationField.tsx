import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, View } from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../../app/providers/AuthProvider';
import { useLocale } from '../../../app/providers/LocaleProvider';
import { AppText } from '../../../components/ui/AppText';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { locationsApi } from '../api/locations-api';
import { LocationDraft } from '../state/location-draft';
import { pointFromText, type LocationValue, type Point } from '../models';
import { LocationMap } from './LocationMap';
import { LocationAttribution } from './LocationAttribution';
import type { SavedAddress } from '../../accounts/models';
import { theme } from '../../../theme/tokens';
export function LocationField({ lat, lng, text = '', radius, prefix, disabled = false, onChange }: {
  lat: string; lng: string; text?: string; radius?: number; prefix: string; disabled?: boolean;
  onChange: (v: LocationValue) => void;
}) {
  const { t } = useLocale(), { state: auth } = useAuth();
  const [opened, setOpened] = useState(false);
  const owner = auth.user?.id ?? 'guest';
  useEffect(() => { setOpened(false); }, [owner]);
  const point = pointFromText(lat, lng);
  return <View style={{ gap: theme.spacing.sm }}>
    {point && <AppText tone="muted">{text || `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`}</AppText>}
    {point && <LocationAttribution />}
    <Button testID={`${prefix}-pick-location`} label={t(point ? 'location.change' : 'location.open')} variant="secondary" disabled={disabled} onPress={() => setOpened(true)} />
    {opened && <LocationPicker key={owner} initial={point ? { text, point, source: 'saved' } : null} radius={radius} close={() => setOpened(false)} confirm={value => { if (!disabled) { onChange(value); setOpened(false); } }} />}
  </View>;
}
function LocationPicker({ initial, radius, close, confirm }: { initial: LocationValue | null; radius?: number; close: () => void; confirm: (v: LocationValue) => void }) {
  const { t, locale } = useLocale();
  const { manager, state: auth } = useAuth();
  const [saved, setSaved] = useState<SavedAddress[]>([]), [next, setNext] = useState<string | null>(null), [savedError, setSavedError] = useState(false);
  const [savedBusy, setSavedBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const loadSaved = async (cursor?: string) => {
    const owner = auth.user?.id; if (!owner || savedBusy) return; setSavedBusy(true); setSavedError(false);
    try { const page = await manager.listAddresses(owner, cursor); if (alive.current) { setSaved(v => cursor ? [...v, ...page.items] : page.items); setNext(page.next_cursor); } }
    catch { if (alive.current) setSavedError(true); }
    finally { if (alive.current) setSavedBusy(false); }
  };
  const [draft] = useState(() => new LocationDraft(locationsApi, initial));
  const state = useSyncExternalStore(draft.subscribe, draft.getSnapshot, draft.getSnapshot);
  const [mapError, setMapError] = useState(false), [mapVersion, setMapVersion] = useState(0);
  const [gps, setGps] = useState<'idle' | 'busy' | 'denied' | 'failed'>('idle'), [accuracy, setAccuracy] = useState<number | null>(null);
  const queryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intent = useRef(0), reverseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportMapError = useCallback(() => setMapError(true), []);
  const invalidate = useCallback(() => { intent.current++; if (queryTimer.current) clearTimeout(queryTimer.current); if (reverseTimer.current) clearTimeout(reverseTimer.current); draft.cancel(); setGps('idle'); setAccuracy(null); }, [draft]);
  useEffect(() => () => { intent.current++; if (queryTimer.current) clearTimeout(queryTimer.current); if (reverseTimer.current) clearTimeout(reverseTimer.current); draft.cancel(); }, [draft]);
  useEffect(() => { invalidate(); if (!draft.getSnapshot().value) draft.query(draft.getSnapshot().query); }, [locale, invalidate, draft]);
  useEffect(() => {
    if (state.value || state.query.trim().length < 3) return;
    const timer = queryTimer.current = setTimeout(() => { if (!draft.getSnapshot().value) void draft.search('autocomplete', locale); }, 400);
    return () => clearTimeout(timer);
  }, [draft, state.query, locale, !!state.value]);
  const pin = (point: Point) => {
    invalidate(); void draft.pin(point, locale, 'manual');
    reverseTimer.current = setTimeout(() => void draft.pin(point, locale), 450);
  };
  const locate = async () => {
    invalidate(); const ticket = intent.current; setGps('busy');
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (intent.current !== ticket) return;
      if (permission.status !== 'granted') { setGps('denied'); return; }
      const result = await Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('timeout')), 12000); })]);
      if (intent.current !== ticket) return;
      if (Date.now() - result.timestamp > 60000) { setGps('failed'); return; }
      setAccuracy(result.coords.accuracy); setGps('idle');
      void draft.pin({ latitude: result.coords.latitude, longitude: result.coords.longitude }, locale, 'gps');
    } catch { if (intent.current === ticket) setGps('failed'); }
    finally { if (timeout) clearTimeout(timeout); }
  };
  return <Modal visible animationType="slide" onRequestClose={close}>
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.surface, paddingTop: 40 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        <AppText variant="title">{t('location.title')}</AppText>
        <AppText variant="caption" tone="muted">{t('location.privacy')}</AppText>
        <Input testID="location-query" label={t('location.query')} value={state.query} maxLength={300} onChangeText={v => { invalidate(); draft.query(v); }} returnKeyType="search" onSubmitEditing={() => { invalidate(); void draft.search('geocode', locale); }} />
        <Button testID="location-search" label={t('location.search')} disabled={state.query.trim().length < 3} loading={state.busy} onPress={() => { invalidate(); void draft.search('geocode', locale); }} />
        {state.items.map((item, index) => <Button key={`${item.id}-${index}`} testID={`location-result-${index}`} variant="secondary" label={`${item.text}${item.precision === 'approximate' ? ` · ${t('location.approximate')}` : ''}`} onPress={() => { invalidate(); draft.choose(item); }} />)}
        {state.searched && !state.items.length && <AppText>{t('location.empty')}</AppText>}
        {state.error && <AppText accessibilityRole="alert" tone="error">{t(state.error === 'RATE_LIMITED' ? 'errors.rateLimited' : 'location.lookupError')}</AppText>}
        {auth.user && <Button label={t('search.savedAddresses')} variant="secondary" loading={savedBusy} onPress={() => void loadSaved()} />}
        {savedError && <AppText tone="error">{t('accountTools.error')}</AppText>}
        {saved.map(a => <Button key={a.id} label={`${a.label} · ${a.address.text}`} variant="secondary" onPress={() => { invalidate(); draft.choose({...a.address, source:'saved'}); }} />)}
        {next && <Button label={t('accountTools.more')} disabled={savedBusy} onPress={() => void loadSaved(next)} />}
        <Button testID="location-gps" variant="secondary" label={t('location.gps')} loading={gps === 'busy'} onPress={() => void locate()} />
        {gps === 'denied' && <AppText tone="error">{t('location.gpsDenied')}</AppText>}
        {gps === 'failed' && <AppText tone="error">{t('location.gpsFailed')}</AppText>}
        {accuracy !== null && <AppText>{t('location.accuracy', { meters: Math.round(accuracy) })}</AppText>}
        <View testID="location-map" style={{ height: 280, overflow: 'hidden', borderRadius: 12 }}>
          <LocationMap key={mapVersion} point={state.value?.point ?? null} radius={radius} onChoose={pin} onError={reportMapError} />
        </View>
        <LocationAttribution />
        <AppText tone="muted">{t('location.mapHint')}</AppText>
        {mapError && <><AppText tone="error">{t('location.mapError')}</AppText><Button label={t('common.retry')} variant="secondary" onPress={() => { setMapError(false); setMapVersion(v => v + 1); }} /></>}
        {state.value && <>
          <AppText>{state.value.point.latitude.toFixed(6)}, {state.value.point.longitude.toFixed(6)}</AppText>
          {state.approximate && <AppText tone="muted">{t('location.checkPin')}</AppText>}
          <Input testID="location-description" label={t('location.description')} value={state.value.text} maxLength={1000} onChangeText={v => { if (reverseTimer.current) clearTimeout(reverseTimer.current); draft.describe(v); }} />
        </>}
      </ScrollView>
      <View style={{ padding: 16, paddingBottom: 28, gap: 8 }}>
        <Button testID="location-confirm" label={t('location.confirm')} disabled={!state.value?.text.trim() || state.busy || gps === 'busy'} onPress={() => { const value = draft.getSnapshot().value; if (value?.text.trim()) confirm({ ...value, text: value.text.trim() }); }} />
        <Button testID="location-cancel" label={t('accountTools.cancel')} variant="secondary" onPress={close} />
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
