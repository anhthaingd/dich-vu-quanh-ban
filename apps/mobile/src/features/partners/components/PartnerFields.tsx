import { View, StyleSheet } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { useLocale } from '../../../app/providers/LocaleProvider';
import { theme } from '../../../theme/tokens';
type Option =
  | 'solo'
  | 'shop'
  | 'company'
  | 'at_shop'
  | 'at_customer'
  | 'custom'
  | 'profile'
  | 'skills'
  | 'areas'
  | 'gallery'
  | 'locations';
export function Options<T extends Option>({
  values,
  value,
  onChange,
  disabled = false,
  testID,
  layout = 'wrap'
}: {
  values: readonly T[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  testID?: string;
  layout?: 'wrap' | 'sections';
}) {
  const { t } = useLocale();
  const sectionLabels = {
    profile: 'partners.tabProfile',
    skills: 'partners.tabSkills',
    areas: 'partners.tabAreas',
    locations: 'partners.tabLocations'
  } as const;
  return (
    <View style={styles.options}>
      {values.map((v) => (
        <View
          key={v}
          style={layout === 'sections' ? styles.section : undefined}
        >
          <Button
            testID={testID ? `${testID}-${v}` : undefined}
            label={t(
              layout === 'sections' && v in sectionLabels
                ? sectionLabels[v as keyof typeof sectionLabels]
                : (`partners.${v}` as `partners.${Option}`)
            )}
            variant={value === v ? 'primary' : 'secondary'}
            accessibilityState={{ selected: value === v }}
            disabled={disabled}
            onPress={() => onChange(v)}
          />
        </View>
      ))}
    </View>
  );
}
export const coordinateNumber = (v: string) => (v.trim() ? Number(v) : NaN);
const styles = StyleSheet.create({
  section: { width: '48%', flexGrow: 1 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }
});
