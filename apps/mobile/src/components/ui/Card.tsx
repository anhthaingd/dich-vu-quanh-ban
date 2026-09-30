import { View, Pressable, StyleSheet, type ViewProps } from 'react-native';
import { AppText } from './AppText';
import { theme } from '../../theme/tokens';
export function Card({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.card, style]} />;
}
export function ActionCard({ title, onPress }: { title: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}
    style={({ pressed }) => [styles.card, { opacity: pressed ? 0.75 : 1 }]}>
    <AppText variant="card">{title}</AppText>
    <AppText variant="caption" tone="primary">Xem dịch vụ →</AppText>
  </Pressable>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.panel, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.panel, gap: theme.spacing.md },
});
