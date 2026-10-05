import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme/tokens';

type Props = PropsWithChildren<{
  onBack?: () => void;
  onAccount?: () => void;
  onCatalog?: () => void;
  keyboardDismissMode?: ScrollViewProps['keyboardDismissMode'];
}>;
// UI-16: account belongs in the header, never in the bottom navigation.
// Only catalog is available today; add other destinations with their real features.
export function ProductShell({ children, onBack, onAccount, onCatalog, keyboardDismissMode }: Props) {
  const { t } = useLocale();
  const { state } = useAuth();
  const displayName = state.phase === 'authenticated' ? state.user!.display_name.trim() : '';
  const initial = Array.from(displayName)[0]?.toLocaleUpperCase() || '?';
  const header = <View style={styles.header}>
    <View style={styles.headerContent}>
      {onBack ? <Button testID="nav-back" label={t('common.backButton')} accessibilityLabel={t('common.back')} variant="link" onPress={onBack} />
        : <View style={styles.brand}>
          <View style={styles.mark} accessible={false}><AppText tone="surface" allowFontScaling={false} style={styles.markText}>↗</AppText></View>
          <AppText variant="brand" style={styles.brandText}>DỊCH VỤ QUANH BẠN</AppText>
        </View>}
      {onAccount && <Pressable testID="nav-account" accessibilityRole="button" accessibilityLabel={t('common.account')}
        accessibilityHint={t('shell.openAccount')} onPress={onAccount}
        style={({ pressed }) => [styles.avatar, { opacity: pressed ? 0.65 : 1 }]}>
        <AppText testID="account-initial" tone="primary" style={styles.initial}>{initial}</AppText>
      </Pressable>}
    </View>
  </View>;
  const footer = onCatalog ? <View style={styles.footer}>
    <Pressable testID="nav-catalog" accessibilityRole="tab" accessibilityState={{ selected: true }} aria-selected={true}
      accessibilityLabel={t('shell.findServices')} onPress={onCatalog}
      style={({ pressed }) => [styles.destination, { opacity: pressed ? 0.65 : 1 }]}>
      <View style={styles.activeLine} />
      <AppText tone="primary" style={styles.destinationText}>{t('shell.findServices')}</AppText>
    </Pressable>
  </View> : undefined;
  return <Screen header={header} footer={footer} keyboardDismissMode={keyboardDismissMode}>{children}</Screen>;
}
const styles = StyleSheet.create({
  header: { backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderColor: theme.colors.border },
  headerContent: { minHeight: 72, paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.panel, width: '100%', maxWidth: 640, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  brandText: { flexShrink: 1 },
  mark: { width: 36, height: 36, borderRadius: theme.radius.control, borderBottomLeftRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary },
  markText: { fontSize: 24, lineHeight: 30 },
  avatar: { minWidth: 48, minHeight: 48, borderRadius: 24, padding: theme.spacing.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primarySoft, borderWidth: 1, borderColor: theme.colors.border },
  initial: { fontSize: 20, fontWeight: '700' },
  footer: { backgroundColor: theme.colors.surface, borderTopWidth: 1, borderColor: theme.colors.border, alignItems: 'center' },
  destination: { minHeight: 56, paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.md, gap: theme.spacing.sm, alignItems: 'center', maxWidth: '100%' },
  activeLine: { height: 3, width: 32, backgroundColor: theme.colors.primary, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  destinationText: { fontWeight: '600', textAlign: 'center', flexShrink: 1 },
});
