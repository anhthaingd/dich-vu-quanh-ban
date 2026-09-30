import { Text, type TextProps } from 'react-native';
import { theme } from '../../theme/tokens';
type Props = TextProps & { variant?: keyof typeof theme.typography; tone?: keyof typeof theme.colors };
export function AppText({ variant = 'body', tone = 'text', style, ...props }: Props) {
  return <Text {...props} style={[theme.typography[variant], { color: theme.colors[tone] }, style]} />;
}
