import { useId } from 'react';
import { TextInput, View, StyleSheet, type TextInputProps } from 'react-native';
import { AppText } from './AppText';
import { theme } from '../../theme/tokens';
type Props = TextInputProps & { label: string; hint?: string; error?: string };
export function Input({ label, hint, error, style, ...props }: Props) {
  const id = useId();
  return <View style={styles.field}>
    <AppText nativeID={`${id}-label`}>{label}</AppText>
    <TextInput {...props} accessibilityLabel={label} accessibilityHint={error ?? hint}
      aria-invalid={!!error} aria-describedby={error || hint ? `${id}-message` : undefined}
      style={[styles.input, error ? styles.invalid : null, style]} />
    {(error || hint) && <AppText nativeID={`${id}-message`} variant="caption" tone={error ? 'error' : 'muted'}
      accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite">{error ?? hint}</AppText>}
  </View>;
}
const styles = StyleSheet.create({
  field: { gap: theme.spacing.sm },
  input: { ...theme.typography.body, minHeight: 48, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.control, color: theme.colors.text, backgroundColor: theme.colors.surface },
  invalid: { borderColor: theme.colors.error },
});
