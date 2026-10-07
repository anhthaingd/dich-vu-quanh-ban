import { LocationField } from '../../location/components/LocationField';
import { LocationAttribution } from '../../location/components/LocationAttribution';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Keyboard, Switch, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../app/navigation/routes';
import { useAuth } from '../../../app/providers/AuthProvider';
import { useLocale } from '../../../app/providers/LocaleProvider';
import { AppText } from '../../../components/ui/AppText';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { AccountPage } from '../components/AccountPage';
import { CollectionStatus } from '../components/CollectionStatus';
import { AccountCollection } from '../state/account-collection';
import type { AddressInput, SavedAddress } from '../models';
type Draft = { id: string | null; version?: number; label: string; text: string; lat: string; lng: string; is_default: boolean };
const draftOf = (a?: SavedAddress): Draft => ({ id: a?.id ?? null, version: a?.version, label: a?.label ?? '', text: a?.address.text ?? '', lat: a ? String(a.address.point.latitude) : '', lng: a ? String(a.address.point.longitude) : '', is_default: a?.is_default ?? false });
const inputOf = (d: Draft): AddressInput => ({ label: d.label.trim(), address: { text: d.text.trim(), point: { latitude: Number(d.lat), longitude: Number(d.lng) } }, is_default: d.is_default, ...(d.id ? { expected_version: d.version } : {}) });
export function AddressesScreen({ navigation }: NativeStackScreenProps<RootStackParamList,'Addresses'>) {
  return <AccountPage title="addresses.title" back={() => navigation.goBack()} login={() => navigation.replace('Account', { returnTo: 'Addresses' })}>
    {owner => <Addresses key={owner} owner={owner} />}
  </AccountPage>;
}
function Addresses({ owner }: { owner: string }) {
  const { manager, state: auth } = useAuth(); const { t } = useLocale();
  const [collection] = useState(() => new AccountCollection<SavedAddress>(cursor => manager.listAddresses(owner,cursor)));
  const state = useSyncExternalStore(collection.subscribe,collection.getSnapshot,collection.getSnapshot);
  const [draft,setDraft] = useState<Draft | null>(null), [archive,setArchive] = useState<SavedAddress | null>(null), [invalid,setInvalid] = useState(false);
  useEffect(() => { void collection.load(); }, [collection]);
  const disabled = state.busy || state.pending || auth.busy;
  const changed = !!draft?.id && state.error === 'VERSION_CONFLICT';
  const update = (values: Partial<Draft>) => { if(!disabled) { setDraft(d => d ? {...d,...values} : d); setInvalid(false); } };
  const finish = (ok: boolean) => { if(ok) { setDraft(null); setArchive(null); } };
  const reload = async () => {
    await collection.load(false,draft?.id ?? undefined);
    if(draft?.id) {
      const latest = collection.getSnapshot().items.find(a => a.id===draft.id);
      if(latest) setDraft(d => d ? {...d,version:latest.version} : d);
    }
  };
  const save = () => {
    if(!draft) return;
    const input = inputOf(draft);
    if(!input.label || !input.address.text || !draft.lat.trim() || !draft.lng.trim() || !Number.isFinite(input.address.point.latitude) || Math.abs(input.address.point.latitude)>90 || !Number.isFinite(input.address.point.longitude) || Math.abs(input.address.point.longitude)>180) { setInvalid(true); return; }
    Keyboard.dismiss(); void collection.perform(key => manager.saveAddress(owner,draft.id,input,key)).then(finish);
  };
  return <>
    <AppText tone="muted">{t('addresses.intro')}</AppText>
    <CollectionStatus state={state} retry={() => void collection.perform().then(finish)} reload={() => void reload()} />
    {!draft && !archive && <Button testID="address-add" label={t('addresses.add')} disabled={disabled || !state.loaded} onPress={() => { setInvalid(false);setDraft(draftOf()); }} />}
    {draft && <Card>
      <AppText variant="section">{t(draft.id ? 'addresses.edit' : 'addresses.add')}</AppText>
      <Input testID="address-label" label={t('addresses.label')} value={draft.label} editable={!disabled} onChangeText={label => update({label})} />
      <Input testID="address-text" label={t('addresses.text')} value={draft.text} editable={!disabled} onChangeText={text => update({text})} />
      <LocationField prefix="address" lat={draft.lat} lng={draft.lng} text={draft.text} disabled={disabled}
        onChange={value => update({text:value.text, lat:String(value.point.latitude), lng:String(value.point.longitude)})} />
      <View><AppText>{t('addresses.default')}</AppText><Switch testID="address-default" accessibilityLabel={t('addresses.default')} value={draft.is_default} disabled={disabled} onValueChange={is_default => update({is_default})} /></View>
      {invalid && <AppText accessibilityRole="alert" tone="error">{t('accountTools.invalid')}</AppText>}
      <Button testID="address-save" label={t('addresses.save')} disabled={disabled || changed} onPress={save} />
      <Button label={t('accountTools.cancel')} variant="secondary" disabled={disabled} onPress={() => setDraft(null)} />
    </Card>}
    {archive && <Card>
      <AppText>{t('addresses.confirmArchive',{label:archive.label})}</AppText>
      <Button testID="address-confirm-archive" label={t('addresses.archive')} disabled={disabled} onPress={() => void collection.perform(key => manager.archiveAddress(owner,archive.id,key)).then(finish)} />
      <Button label={t('accountTools.cancel')} variant="secondary" disabled={disabled} onPress={() => setArchive(null)} />
    </Card>}
    {!draft && !archive && <>
      {state.loaded && !state.items.length && <AppText testID="addresses-empty">{t('addresses.empty')}</AppText>}
      {state.items.map(item => <Card key={item.id} testID={`address-${item.id}`}>
        <AppText variant="card">{item.label}</AppText><AppText>{item.address.text}</AppText><LocationAttribution />
        {item.is_default && <AppText testID="address-default-badge">{t('addresses.default')}</AppText>}
        <Button testID="address-edit" label={t('addresses.edit')} variant="secondary" disabled={disabled} onPress={() => { setInvalid(false);setDraft(draftOf(item)); }} />
        {!item.is_default && <Button testID="address-make-default" label={t('addresses.makeDefault')} variant="secondary" disabled={disabled} onPress={() => void collection.perform(key => manager.saveAddress(owner,item.id,{...inputOf(draftOf(item)),is_default:true},key))} />}
        <Button testID="address-archive" label={t('addresses.archive')} variant="link" disabled={disabled} onPress={() => setArchive(item)} />
      </Card>)}
      {state.next && <Button label={t('accountTools.more')} disabled={disabled} onPress={() => void collection.load(true)} />}
    </>}
  </>;
}
