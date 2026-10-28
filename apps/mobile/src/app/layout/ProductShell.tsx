import {useProductRole} from '../providers/ProductRoleProvider';
import {financeText} from '../../features/finance/messages';
import {useNotifications} from '../../features/notifications/NotificationsProvider';
import {useMessageUnread} from '../../features/chat/MessageUnreadProvider';
import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { Icon } from '../../components/ui/Icon';
import { theme } from '../../theme/tokens';
export type ShellProps = PropsWithChildren<{
  title?: string;
  root?: boolean;
  scrollable?: boolean;
  onBack?: () => void;
  onAccount?: () => void;
  onCatalog?: () => void;
  onJobs?: () => void;
  onMessages?: () => void;
  onNotifications?: () => void;
  onWallet?: (id:string) => void;
  activeTab?: 'catalog' | 'jobs' | 'wallet' | 'messages' | 'notifications';
  discovery?: boolean;
  keyboardDismissMode?: ScrollViewProps['keyboardDismissMode'];
  refreshControl?: ScrollViewProps['refreshControl'];
}>;
// UI-16: avatar opens account; notifications have their own tab.
export function ProductShell({ children, title, root = false, scrollable = true, onBack, onAccount, onCatalog, onJobs, onMessages, onNotifications, onWallet, activeTab = 'catalog', discovery, keyboardDismissMode, refreshControl }: ShellProps) {
  const { t,locale } = useLocale();
  const {membership}=useProductRole();
  const unread=useNotifications().items.filter(n=>!n.read_at).length;
  const messages=useMessageUnread().unread;
  const { state } = useAuth();
  const displayName = state.phase === 'authenticated' ? state.user!.display_name.trim() : '';
  const initial = Array.from(displayName)[0]?.toLocaleUpperCase() || '?';
  const header = <View style={styles.header}>
    <View style={styles.headerContent}>
      <View style={styles.heading}>{onBack && !root && <Pressable testID="nav-back" accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={onBack} style={({pressed})=>[styles.back,pressed&&{backgroundColor:theme.colors.primarySoft}]}><Icon name="back" size={24} color={theme.colors.text}/></Pressable>}
      {title ? <AppText accessibilityRole="header" style={styles.title}>{title}</AppText> : <View style={styles.brand}>
          <View style={styles.mark}><Icon name="navigation" color="#fff" /></View>
          <AppText style={styles.brandText}>Dịch vụ quanh bạn</AppText>
        </View>}</View>
      {onAccount && <Pressable testID="nav-account" accessibilityRole="button" accessibilityLabel={t('common.account')}
        accessibilityHint={t('shell.openAccount')} onPress={onAccount} hitSlop={6}
        style={({ pressed }) => [styles.avatar, { opacity: pressed ? 0.65 : 1 }]}>
        <AppText testID="account-initial" tone="primary" style={styles.initial}>{initial}</AppText>
      </Pressable>}
    </View>
  </View>;
  const tabs = [
    ...(!membership?[{ id: 'catalog' as const, icon: 'search' as const, label: t('shell.findServices'), onPress: onCatalog }]:[]),
    { id: 'jobs', icon: 'jobs', label: t('jobs.title'), onPress: onJobs },
    ...(membership?.is_owner?[{id:'wallet' as const,icon:'wallet' as const,label:financeText(locale,'wallet'),onPress:onWallet?()=>onWallet(membership.partner_id):undefined}]:[]),
    { id: 'messages', icon: 'messages', label: t('chat.title'), onPress: onMessages },
    { id: 'notifications', icon: 'bell', label: t('home.notifications'), onPress: onNotifications },
  ] as const;
  const footer = onCatalog ? <View style={styles.footer}>
    {tabs.map(tab => <Pressable key={tab.id} testID={`nav-${tab.id}`} accessibilityRole="tab"
      accessibilityState={{ selected: activeTab === tab.id, disabled: !tab.onPress }} aria-selected={activeTab === tab.id}
      accessibilityLabel={tab.label} accessibilityHint={!tab.onPress ? t('home.unavailable') : undefined}
      onPress={tab.onPress} disabled={!tab.onPress}
      style={({ pressed }) => [styles.destination, { opacity: pressed ? 0.65 : 1 }]}>
      {((tab.id==='notifications'&&unread>0)||(tab.id==='messages'&&messages>0))&&<View testID={tab.id==='messages'?'message-badge':'notification-badge'} style={styles.badge}><AppText style={styles.badgeText}>{Math.min(tab.id==='messages'?messages:unread,99)}{(tab.id==='messages'?messages:unread)>99?'+':''}</AppText></View>}
      <Icon name={tab.icon} color={activeTab === tab.id ? theme.colors.primary : '#78869E'} />
      <AppText style={[styles.destinationText, {color: activeTab === tab.id ? theme.colors.primary : '#78869E', fontWeight: activeTab === tab.id ? '700' : '400'}]}>{tab.label}</AppText>
    </Pressable>)}
  </View> : undefined;
  return <Screen scrollable={scrollable} refreshControl={refreshControl} alwaysBounceVertical={refreshControl ? true : undefined} header={header} footer={footer} keyboardDismissMode={keyboardDismissMode}
    style={discovery ? styles.white : undefined} contentContainerStyle={discovery ? styles.discovery : undefined}>{children}</Screen>;
}
const styles = StyleSheet.create({
  heading: {flex:1,flexDirection:'row',alignItems:'center',gap:8},
  back: {width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center'},
  title: {flex:1,fontSize:18,lineHeight:26,fontWeight:'700'},
  badge: {position:'absolute',top:0,right:16,borderRadius:12,backgroundColor:'#B42318',paddingHorizontal:5},
  badgeText: {color:'#fff',fontSize:11,lineHeight:18},
  white: {backgroundColor: '#fff'},
  discovery: {paddingHorizontal:16, paddingTop:8, gap:0, backgroundColor:'#fff'},
  header: { backgroundColor: '#fff' },
  headerContent: { minHeight: 68, paddingVertical: 12, paddingHorizontal: 16, width: '100%', maxWidth: 640, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandText: { flexShrink: 1, fontSize:15, lineHeight:22, fontWeight:'700' },
  mark: { width: 32, height: 32, borderRadius: 12, borderBottomLeftRadius: 3, transform:[{rotate:'-5deg'}], alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9EEF8' },
  initial: { fontSize: 14, lineHeight:20, fontWeight: '700' },
  footer: { backgroundColor: '#fff', borderTopWidth: 1, borderColor: theme.colors.border, flexDirection:'row', justifyContent:'space-around', paddingVertical:9, paddingHorizontal:8 },
  destination: { minHeight: 46, flex:1, gap:4, alignItems: 'center', justifyContent:'center' },
  destinationText: { fontSize:11, lineHeight:16, textAlign:'center' },
});
