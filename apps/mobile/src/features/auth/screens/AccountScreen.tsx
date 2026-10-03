import { useLocale } from '../../../app/providers/LocaleProvider';
import { LanguageSettings } from '../../accounts/components/LanguageSettings';
import type { AuthErrorCode } from '../state/auth-session';
import type { MessageKey } from '../../../lib/i18n';
import { useCallback, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../../app/providers/AuthProvider';
import type { RootStackParamList } from '../../../app/navigation/routes';
import { Screen } from '../../../components/ui/Screen';
import { AppText } from '../../../components/ui/AppText';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card } from '../../../components/ui/Card';
import { LoadingState } from '../../../components/ui/Feedback';

const errorMessages: Record<AuthErrorCode, MessageKey & `errors.${string}`> = {
  UNAUTHENTICATED: 'errors.authentication', RATE_LIMITED: 'errors.rateLimited', VALIDATION: 'errors.validation', SESSION_UNAVAILABLE: 'errors.session',
};
export function AccountScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Account'>) {
  const { t } = useLocale();
  const { manager, state } = useAuth();
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [name, setName] = useState('');
  useFocusEffect(useCallback(() => {
    if (manager.getSnapshot().phase === 'authenticated') void manager.verify();
    return () => setPassword('');
  }, [manager]));
  const canSubmit = !!email.trim() && !!password && (!register || !!name.trim()) && !state.busy;
  const submit = async () => {
    if (!canSubmit) return;
    Keyboard.dismiss();
    if (register) await manager.register({ email, password, display_name: name });
    else await manager.login({ email, password });
    setPassword('');
  };
  return <Screen keyboardDismissMode="on-drag">
    <Button testID="nav-back" label={t('common.backButton')} accessibilityLabel={t('common.back')} variant="link" onPress={() => navigation.goBack()} />
    <AppText variant="title" accessibilityRole="header">{t('common.account')}</AppText>
    <LanguageSettings />
    {state.error && <AppText tone="error" accessibilityRole="alert">{t(errorMessages[state.error])}</AppText>}
    {state.phase === 'loading' && <LoadingState message={t('auth.restoring')} />}
    {state.phase === 'restore-error' && <Button label={t('common.retry')} loading={state.busy} onPress={() => void manager.restore()} />}
    {state.phase === 'authenticated' && <Card>
      <AppText variant="section">{state.user!.display_name}</AppText>
      <AppText>{t(state.user!.email_verified ? 'auth.verified' : 'auth.unverified')}</AppText>
      <Button testID="auth-logout" label={t('auth.logout')} loading={state.busy} onPress={() => void manager.logout()} />
    </Card>}
    {state.phase === 'anonymous' && <>
      <AppText variant="section" accessibilityRole="header">{t(register ? 'auth.createAccount' : 'auth.login')}</AppText>
      {register && <Input testID="auth-name" label={t('auth.name')} value={name} onChangeText={setName} editable={!state.busy} autoComplete="name" maxLength={100} />}
      <Input testID="auth-email" label={t('auth.email')} value={email} onChangeText={setEmail} editable={!state.busy} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" maxLength={254} />
      <Input key={register ? 'new-password' : 'current-password'} testID="auth-password" label={t('auth.password')} value={password} onChangeText={setPassword} editable={!state.busy} secureTextEntry autoCapitalize="none" autoCorrect={false}
        autoComplete={register ? (Platform.OS === 'ios' ? 'off' : 'new-password') : 'current-password'}
        // iOS 27's new-password input view intercepts typing/taps in this native
        // build. Keep secure manual entry for signup; login autofill stays on.
        textContentType={register && Platform.OS === 'ios' ? 'none' : undefined}
        returnKeyType="done" onSubmitEditing={() => void submit()}
        hint={register ? t('auth.passwordHint', { min: 15, max: 128 }) : undefined} />
      <Button testID="auth-submit" label={t(register ? 'auth.register' : 'auth.login')} loading={state.busy} disabled={!canSubmit} onPress={() => void submit()} />
      <Button testID="auth-toggle" label={t(register ? 'auth.switchToLogin' : 'auth.switchToRegister')} variant="link" disabled={state.busy}
        onPress={() => { setRegister(!register); setPassword(''); }} />
    </>}
  </Screen>;
}
