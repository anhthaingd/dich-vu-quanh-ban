import {sessionOperation} from '../../jobs/state/session-ready';
import {formatInteger} from '../../invoices/format-amount';
import {type PointWallet} from '../../invoices/models';
import {useProductRole} from '../../../app/providers/ProductRoleProvider';
import {securityMessages} from '../../account-security/messages';
import { useLocale } from '../../../app/providers/LocaleProvider';
import { LanguageSettings } from '../../accounts/components/LanguageSettings';
import type { AuthErrorCode } from '../state/auth-session';
import type { MessageKey } from '../../../lib/i18n';
import { useCallback, useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../../app/providers/AuthProvider';
import { accountDestination } from '../../../app/navigation/routes';
import type { RootStackParamList } from '../../../app/navigation/routes';
import { ProductShell } from '../../../app/layout/ProductShell';
import { theme } from '../../../theme/tokens';
import { AppText } from '../../../components/ui/AppText';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card } from '../../../components/ui/Card';
import { LoadingState } from '../../../components/ui/Feedback';

const errorMessages: Record<AuthErrorCode, MessageKey & `errors.${string}`> = {
  UNAUTHENTICATED: 'errors.authentication', RATE_LIMITED: 'errors.rateLimited', VALIDATION: 'errors.validation', SESSION_UNAVAILABLE: 'errors.session',
};
export function AccountScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Account'>) {
  const role=useProductRole();
  const { t,locale } = useLocale();
  const security=securityMessages(locale);
  const { manager, state } = useAuth();
  const focused = useIsFocused();
  const destination = accountDestination(route.params?.returnTo);
  useEffect(() => {
    if (focused && destination && state.phase === 'authenticated' && !state.busy && !state.user?.admin_permissions?.length) {
      if(typeof destination==='string')navigation.replace(destination);
      else if(destination.screen==='Conversations')navigation.replace('Conversations',destination.params);
      else if(destination.screen==='JobCreate')navigation.replace('JobCreate',destination.params);
      else navigation.replace(destination.screen,destination.params);
    }
  }, [focused, destination, state.phase, state.busy, navigation]);
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
  return <ProductShell title={t('common.account')} keyboardDismissMode="on-drag" onBack={() => navigation.goBack()}>
    {state.phase!=='authenticated'&&<Card><AppText variant="card">{t('shell.preferences')}</AppText><LanguageSettings /></Card>}
    <View style={styles.section}>
    {state.error && <AppText tone="error" accessibilityRole="alert">{t(errorMessages[state.error])}</AppText>}
    {state.phase === 'loading' && <LoadingState message={t('auth.restoring')} />}
    {state.phase === 'restore-error' && <Button label={t('common.retry')} loading={state.busy} onPress={() => void manager.restore()} />}
    {state.phase === 'authenticated' && <>
      <AppText variant="section">{state.user!.display_name}</AppText>
      <AccountPoints key={state.user!.id} owner={state.user!.id}/>
      <Card><AppText variant="card">{t('shell.preferences')}</AppText><LanguageSettings /></Card>
      <AppText variant="caption" tone="muted">{t(state.user!.email_verified ? 'auth.verified' : 'auth.unverified')}</AppText>
      <AppText>{t('shell.currentRole')}: {role.membership?role.membership.partner_name:t('shell.customerRole')}</AppText>
      <AccountLink testID="role-customer" label={t('shell.customerRole')} onPress={()=>{void role.choose(null);navigation.popTo('CatalogHome');}}/>
      <AccountLink testID="role-profiles" label={t('shell.chooseProfile')} disabled={state.busy} onPress={()=>navigation.navigate('Organizations')}/>
      <AccountLink testID="security-open" label={security.title} disabled={state.busy} onPress={()=>navigation.navigate('AccountSecurity')} />
      <AccountLink testID="support-open" label={t('support.title')} disabled={state.busy} onPress={() => navigation.navigate('Support')} />
      <AccountLink testID="notification-settings-open" label={t('notices.settings')} disabled={state.busy} onPress={() => navigation.navigate('NotificationSettings')} />
      <AccountLink testID="team-open" label={t('team.title')} disabled={state.busy} onPress={() => navigation.navigate('Organizations')} />
      <AccountLink testID="verify-open" label={t('team.verifyTitle')} disabled={state.busy} onPress={() => navigation.navigate('VerifyContact')} />
      <AccountLink testID="jobs-open" label={t('jobs.title')} disabled={state.busy} onPress={() => navigation.navigate('Jobs')} />
      <AccountLink testID="conversations-open" label={t('chat.title')} disabled={state.busy} onPress={() => navigation.navigate('Conversations')} />
      <AccountLink testID="partners-open" label={t('partners.title')} disabled={state.busy} onPress={() => navigation.navigate('Partners')} />
      <AccountLink testID="profile-open" label={t('profile.title')} disabled={state.busy} onPress={() => navigation.navigate('Profile')} />
      <AccountLink testID="sessions-open" label={t('sessions.title')} disabled={state.busy} onPress={() => navigation.navigate('Sessions')} />
      <AccountLink testID="addresses-open" label={t('addresses.title')} disabled={state.busy} onPress={() => navigation.navigate('Addresses')} />
      <AccountLink testID="auth-logout" label={t('auth.logout')} loading={state.busy} onPress={() => void manager.logout()} />
    </>}
    {state.phase === 'anonymous' && <Card>
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
      <Button testID="otp-open" label={security.login+' / '+security.reset} disabled={state.busy} onPress={()=>navigation.navigate('AccountSecurity')} />
      <Button testID="recovery-open" label={security.recovery} disabled={state.busy} onPress={()=>navigation.navigate('AccountRecovery')} />
      <Button testID="auth-toggle" label={t(register ? 'auth.switchToLogin' : 'auth.switchToRegister')} variant="link" disabled={state.busy}
        onPress={() => { setRegister(!register); setPassword(''); }} />
    </Card>}
    </View>
  </ProductShell>;
}

const styles = StyleSheet.create({ link:{minHeight:56,paddingVertical:14,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:1,borderColor:'#edf0f5'},points:{backgroundColor:theme.colors.primarySoft,borderWidth:0}, section: { gap: theme.spacing.lg, paddingTop: theme.spacing.sm } });

function AccountLink({label,onPress,testID,disabled,loading}:{label:string;onPress:()=>void;testID:string;disabled?:boolean;loading?:boolean}){
 return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled:!!(disabled||loading),busy:!!loading}} disabled={disabled||loading} onPress={onPress} style={({pressed})=>[styles.link,{opacity:disabled||loading?0.5:pressed?0.65:1}]}><AppText style={{flex:1}}>{label}</AppText><AppText tone="muted" accessible={false}>›</AppText></Pressable>;
}
function AccountPoints({owner}:{owner:string}){
 const {manager}=useAuth(),{t,locale}=useLocale();
 const [value,setValue]=useState<PointWallet|null>(null),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 useFocusEffect(useCallback(()=>{let active=true;setFailed(false);void sessionOperation(manager,owner,()=>manager.getPoints(owner),()=>active).then(v=>{if(active)setValue(v);}).catch(()=>{if(active){setValue(null);setFailed(true);}});return()=>{active=false;};},[manager,owner,attempt]));
 return <Card style={styles.points}><AppText variant="brand" tone="primary">{t('invoice.pointWallet')}</AppText>{value?<><AppText testID="account-points" variant="title">{formatInteger(value.available,locale)} Point</AppText><AppText variant="caption" tone="muted">{t('invoice.availablePoints')}</AppText></>:failed?<><AppText tone="error">{t('accountTools.error')}</AppText><Button label={t('common.retry')} variant="link" onPress={()=>setAttempt(v=>v+1)}/></>:<AppText>{t('accountTools.loading')}</AppText>}</Card>;
}
