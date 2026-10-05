import { StyleSheet, View } from 'react-native';
import { useLocale } from '../../../app/providers/LocaleProvider';
import { locales, localeNames } from '../../../lib/i18n';
import { AppText } from '../../../components/ui/AppText';
import { Button } from '../../../components/ui/Button';
import { theme } from '../../../theme/tokens';
export function LanguageSettings() {
  const { locale, ready, busy, error, t, selectLocale } = useLocale();
  return <View>
    <AppText variant="caption" tone="muted">{t('common.language')}</AppText>
    <View style={styles.options}>
      {locales.map(value => <Button key={value} testID={`locale-${value}`} label={localeNames[value]}
        variant={value === locale ? 'secondary' : 'link'} accessibilityLanguage={value} accessibilityState={{ selected: value === locale }} aria-pressed={value === locale}
        disabled={!ready || busy} onPress={() => void selectLocale(value)} />)}
    </View>
    {error && <AppText accessibilityRole="alert" tone="error">{t(error === 'READ_FAILED' ? 'errors.localeRead' : 'errors.localeWrite')}</AppText>}
  </View>;
}
const styles = StyleSheet.create({ options: { flexDirection: 'row', flexWrap: 'wrap', columnGap: theme.spacing.lg } });
