import type { ReactNode } from 'react';
import { ScrollView, View, StyleSheet, KeyboardAvoidingView, Platform, type ScrollViewProps } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme/tokens';
type Props = ScrollViewProps & { header?: ReactNode; footer?: ReactNode; scrollable?: boolean };
export function Screen({ contentContainerStyle, header, footer, style, scrollable = true, children, ...props }: Props) {
  const insets = useSafeAreaInsets();
  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.safe} keyboardVerticalOffset={insets.top} behavior={Platform.OS==='ios'?'padding':Platform.OS==='android'?'height':undefined}>
    {header}
    {scrollable ? <ScrollView style={[styles.scroll, style]} {...props} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, contentContainerStyle]}>{children}</ScrollView> : <View style={[styles.content,{flex:1,paddingBottom:0},contentContainerStyle]}>{children}</View>}
    {footer}
  </KeyboardAvoidingView></SafeAreaView>;
}
const styles = StyleSheet.create({
  scroll: { flex: 1 },
  safe: { flex: 1, backgroundColor: theme.colors.surface },
  content: { padding: theme.spacing.panel, paddingBottom: theme.spacing.xxxl, maxWidth: 640, width: '100%', alignSelf: 'center', gap: theme.spacing.md },
});
