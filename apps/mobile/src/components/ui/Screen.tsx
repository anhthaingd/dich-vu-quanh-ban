import { ScrollView, StyleSheet, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme/tokens';
export function Screen({ contentContainerStyle, ...props }: ScrollViewProps) {
  return <SafeAreaView style={styles.safe}>
    <ScrollView {...props} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, contentContainerStyle]} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.xl, paddingBottom: theme.spacing.xxxl, maxWidth: 640, width: '100%', alignSelf: 'center', gap: theme.spacing.md },
});
