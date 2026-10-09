import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { theme } from '../../theme/tokens';
export type ShellProps = PropsWithChildren<{
  onBack?: () => void;
  onAccount?: () => void;
  onCatalog?: () => void;
  onJobs?: () => void;
  onMessages?: () => void;
  activeTab?: 'catalog' | 'jobs' | 'messages';
  discovery?: boolean;
  keyboardDismissMode?: ScrollViewProps['keyboardDismissMode'];
}>;
// UI-16: avatar opens account; notifications remain disabled until implemented.
export function ProductShell({ children, onBack, onAccount, onCatalog, onJobs, onMessages, activeTab = 'catalog', discovery, keyboardDismissMode }: ShellProps) {
  const { t } = useLocale();
  const { state } = useAuth();
  const displayName = state.phase === 'authenticated' ? state.user!.display_name.trim() : '';
  const initial = Array.from(displayName)[0]?.toLocaleUpperCase() || '?';
  const header = <View style={styles.header}>
    <View style={styles.headerContent}>
      {onBack ? <Button testID="nav-back" label={t('common.backButton')} accessibilityLabel={t('common.back')} variant="link" onPress={onBack} />
        : <View style={styles.brand}>
          <View style={styles.mark}><Icon name="navigation" color="#fff" /></View>
          <AppText style={styles.brandText}>Dịch vụ quanh bạn</AppText>
        </View>}
      {onAccount && <Pressable testID="nav-account" accessibilityRole="button" accessibilityLabel={t('common.account')}
        accessibilityHint={t('shell.openAccount')} onPress={onAccount} hitSlop={6}
        style={({ pressed }) => [styles.avatar, { opacity: pressed ? 0.65 : 1 }]}>
        <AppText testID="account-initial" tone="primary" style={styles.initial}>{initial}</AppText>
      </Pressable>}
    </View>
  </View>;
  const tabs = [
    { id: 'catalog', icon: 'search', label: t('shell.findServices'), onPress: onCatalog },
    { id: 'jobs', icon: 'jobs', label: t('jobs.title'), onPress: onJobs },
    { id: 'messages', icon: 'messages', label: t('chat.title'), onPress: onMessages },
    { id: 'notifications', icon: 'bell', label: t('home.notifications'), onPress: undefined },
  ] as const;
  const footer = onCatalog ? <View style={styles.footer}>
    {tabs.map(tab => <Pressable key={tab.id} testID={`nav-${tab.id}`} accessibilityRole="tab"
      accessibilityState={{ selected: activeTab === tab.id, disabled: !tab.onPress }} aria-selected={activeTab === tab.id}
      accessibilityLabel={tab.label} accessibilityHint={!tab.onPress ? t('home.unavailable') : undefined}
      onPress={tab.onPress} disabled={!tab.onPress}
      style={({ pressed }) => [styles.destination, { opacity: pressed ? 0.65 : 1 }]}>
      <Icon name={tab.icon} color={activeTab === tab.id ? theme.colors.primary : '#78869E'} />
      <AppText style={[styles.destinationText, {color: activeTab === tab.id ? theme.colors.primary : '#78869E', fontWeight: activeTab === tab.id ? '700' : '400'}]}>{tab.label}</AppText>
    </Pressable>)}
  </View> : undefined;
  return <Screen header={header} footer={footer} keyboardDismissMode={keyboardDismissMode}
    style={discovery ? styles.white : undefined} contentContainerStyle={discovery ? styles.discovery : undefined}>{children}</Screen>;
}
const styles = StyleSheet.create({
  white: {backgroundColor: '#fff'},
  discovery: {paddingHorizontal:16, paddingTop:24, gap:0, backgroundColor:'#fff'},
  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: theme.colors.border },
  headerContent: { minHeight: 72, paddingVertical: 12, paddingHorizontal: 16, width: '100%', maxWidth: 640, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandText: { flexShrink: 1, fontSize:15, lineHeight:22, fontWeight:'700' },
  mark: { width: 32, height: 32, borderRadius: 12, borderBottomLeftRadius: 3, transform:[{rotate:'-5deg'}], alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9EEF8' },
  initial: { fontSize: 14, lineHeight:20, fontWeight: '700' },
  footer: { backgroundColor: '#fff', borderTopWidth: 1, borderColor: theme.colors.border, flexDirection:'row', justifyContent:'space-around', paddingVertical:9, paddingHorizontal:8 },
  destination: { minHeight: 46, flex:1, gap:4, alignItems: 'center', justifyContent:'center' },
  destinationText: { fontSize:10, lineHeight:16, textAlign:'center' },
});
