import { StyleSheet, Text, type TextStyle, type TextProps } from 'react-native';
import { theme } from '../../theme/tokens';
type Props = TextProps & { variant?: keyof typeof theme.typography; tone?: keyof typeof theme.colors };
export function AppText({ variant = 'body', tone = 'text', style, ...props }: Props) {
  const weight = StyleSheet.flatten<TextStyle>([theme.typography[variant], style])?.fontWeight;
  const fontFamily = weight === '700' || weight === '800' || weight === 'bold' ? 'BeVietnamBold' : weight === '600' || weight === '500' ? 'BeVietnamSemiBold' : 'BeVietnam';
  return <Text {...props} style={[theme.typography[variant], { color: theme.colors[tone] }, style, { fontFamily, fontWeight: 'normal' }]} />;
}
