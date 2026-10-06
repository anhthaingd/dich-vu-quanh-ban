import { useEffect, useState, useSyncExternalStore } from 'react';
import { Keyboard } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../../app/providers/AuthProvider';
import { useLocale } from '../../../app/providers/LocaleProvider';
import type { RootStackParamList } from '../../../app/navigation/routes';
import { ProductShell } from '../../../app/layout/ProductShell';
import { AppText } from '../../../components/ui/AppText';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card } from '../../../components/ui/Card';
import { LoadingState } from '../../../components/ui/Feedback';
import { LanguageSettings } from '../components/LanguageSettings';
import { ProfileEditor } from '../state/profile-editor';

export function ProfileScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Profile'>) {
  const { state } = useAuth();
  const { t } = useLocale();
  return <ProductShell keyboardDismissMode="on-drag" onBack={() => navigation.goBack()}>
    <AppText variant="title" accessibilityRole="header">{t('profile.title')}</AppText>
    {state.phase === 'authenticated' && state.user ? <ProfileForm key={state.user.id} owner={state.user.id} />
      : <Card><AppText>{t('profile.signedOut')}</AppText><Button label={t('auth.login')} onPress={() => navigation.replace('Account', { returnTo: 'Profile' })} /></Card>}
  </ProductShell>;
}
function ProfileForm({ owner }: { owner: string }) {
  const { manager, state: auth } = useAuth();
  const { t } = useLocale();
  const [editor] = useState(() => new ProfileEditor(manager, owner));
  const state = useSyncExternalStore(editor.subscribe, editor.getSnapshot, editor.getSnapshot);
  useEffect(() => { void editor.load(); }, [editor]);
  const busy = auth.busy || state.loading || state.saving;
  return <>
    <Card><LanguageSettings /></Card>
    <Card>
      {state.loading && <LoadingState message={t('profile.loading')} />}
      {state.loaded && <>
        <AppText>{t('profile.current', { name: state.currentName })}</AppText>
        <Input testID="profile-name" label={t('auth.name')} hint={t('profile.hint')} value={state.name} maxLength={100}
          editable={!busy && !state.pending} onChangeText={editor.setName} autoComplete="name" returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
      </>}
      {state.error && <AppText accessibilityRole="alert" tone="error">{t(state.conflict ? 'profile.conflict'
        : state.error === 'VALIDATION' ? 'profile.validation' : state.error === 'BUSY' ? 'profile.busy' : 'profile.error')}</AppText>}
      {state.pending && <AppText>{t('profile.pending')}</AppText>}
      {state.saved && <AppText testID="profile-saved" accessibilityLiveRegion="polite">{t('profile.saved')}</AppText>}
      {(!state.loaded || state.conflict) && <Button testID="profile-reload" label={t('profile.reload')} disabled={busy} onPress={() => void editor.load()} />}
      {state.loaded && !state.conflict && <Button testID="profile-save" label={t(state.pending ? 'common.retry' : 'profile.save')}
        disabled={busy || !state.name.trim()} loading={state.saving} onPress={() => { Keyboard.dismiss(); void editor.save(); }} />}
    </Card>
  </>;
}
