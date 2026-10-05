import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme/tokens';
type Props = ScrollViewProps & { header?: ReactNode; footer?: ReactNode };
export function Screen({ contentContainerStyle, header, footer, ...props }: Props) {
  return <SafeAreaView style={styles.safe}>
    {header}
    <ScrollView style={styles.scroll} automaticallyAdjustKeyboardInsets {...props} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, contentContainerStyle]} />
    {footer}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  scroll: { flex: 1 },
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.panel, paddingBottom: theme.spacing.xxxl, maxWidth: 640, width: '100%', alignSelf: 'center', gap: theme.spacing.md },
});
