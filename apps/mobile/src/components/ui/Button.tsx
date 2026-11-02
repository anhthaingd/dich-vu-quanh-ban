import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';
import { AppText } from './AppText';
import { theme } from '../../theme/tokens';
type Props = Omit<PressableProps, 'children' | 'style'> & {
  label: string; loading?: boolean; variant?: 'primary' | 'secondary' | 'link' | 'danger';
};
export function Button({ label, loading = false, disabled = false, variant = 'primary', accessibilityState, ...props }: Props) {
  const blocked = disabled || loading;
  return <Pressable {...props} accessibilityRole="button" accessibilityLabel={props.accessibilityLabel ?? label}
    disabled={blocked} accessibilityState={{ ...accessibilityState, disabled: blocked, busy: loading }}
    style={({ pressed }) => [styles.base, styles[variant], { opacity: blocked ? 0.5 : pressed ? 0.75 : 1 }]}>
    {loading && <ActivityIndicator color={variant === 'primary' ? theme.colors.surface : variant === 'danger' ? theme.colors.error : theme.colors.primary} />}
    <AppText tone={variant === 'primary' ? 'surface' : variant === 'danger' ? 'error' : 'primary'} style={styles.label}>{label}</AppText>
  </Pressable>;
}
const styles = StyleSheet.create({
  base: { minHeight: 48, padding: theme.spacing.md, borderRadius: theme.radius.control, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
  primary: { backgroundColor: theme.colors.primary },
  secondary: { backgroundColor: theme.colors.primarySoft, borderWidth: 1, borderColor: theme.colors.primarySoft },
  danger: { backgroundColor: '#FFF5F4', borderWidth: 1, borderColor: '#EBC2BE' },
  link: { alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 0 },
  label: { flexShrink: 1, fontWeight: '600', textAlign: 'center' },
});
