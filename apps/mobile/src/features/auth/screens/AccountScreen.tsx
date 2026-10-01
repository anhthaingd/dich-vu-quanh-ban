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

export function AccountScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Account'>) {
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
    <Button label="← Quay lại" accessibilityLabel="Quay lại" variant="link" onPress={() => navigation.goBack()} />
    <AppText variant="title" accessibilityRole="header">Tài khoản</AppText>
    {state.error && <AppText tone="error" accessibilityRole="alert">{state.error}</AppText>}
    {state.phase === 'loading' && <LoadingState message="Đang khôi phục phiên…" />}
    {state.phase === 'restore-error' && <Button label="Thử lại" loading={state.busy} onPress={() => void manager.restore()} />}
    {state.phase === 'authenticated' && <Card>
      <AppText variant="section">{state.user!.display_name}</AppText>
      <AppText>{state.user!.email_verified ? 'Email đã xác minh' : 'Email chưa xác minh'}</AppText>
      <Button testID="auth-logout" label="Đăng xuất" loading={state.busy} onPress={() => void manager.logout()} />
    </Card>}
    {state.phase === 'anonymous' && <>
      <AppText variant="section" accessibilityRole="header">{register ? 'Tạo tài khoản' : 'Đăng nhập'}</AppText>
      {register && <Input testID="auth-name" label="Tên hiển thị" value={name} onChangeText={setName} editable={!state.busy} autoComplete="name" maxLength={100} />}
      <Input testID="auth-email" label="Email" value={email} onChangeText={setEmail} editable={!state.busy} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" maxLength={254} />
      <Input key={register ? 'new-password' : 'current-password'} testID="auth-password" label="Mật khẩu" value={password} onChangeText={setPassword} editable={!state.busy} secureTextEntry autoCapitalize="none" autoCorrect={false}
        autoComplete={register ? (Platform.OS === 'ios' ? 'off' : 'new-password') : 'current-password'}
        // iOS 27's new-password input view intercepts typing/taps in this native
        // build. Keep secure manual entry for signup; login autofill stays on.
        textContentType={register && Platform.OS === 'ios' ? 'none' : undefined}
        returnKeyType="done" onSubmitEditing={() => void submit()}
        hint={register ? 'Từ 15 đến 128 ký tự. Có thể dùng một cụm từ dễ nhớ.' : undefined} />
      <Button testID="auth-submit" label={register ? 'Đăng ký' : 'Đăng nhập'} loading={state.busy} disabled={!canSubmit} onPress={() => void submit()} />
      <Button testID="auth-toggle" label={register ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'} variant="link" disabled={state.busy}
        onPress={() => { setRegister(!register); setPassword(''); }} />
    </>}
  </Screen>;
}
