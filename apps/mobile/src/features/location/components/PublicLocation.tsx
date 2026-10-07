import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useLocale } from '../../../app/providers/LocaleProvider';
import { AppText } from '../../../components/ui/AppText';
import { Button } from '../../../components/ui/Button';
import type { Point } from '../models';
import { LocationMap } from './LocationMap';
import { LocationAttribution } from './LocationAttribution';
export function PublicLocation({ text, point }: { text: string; point: Point }) {
  const { t } = useLocale(); const [open, setOpen] = useState(false), [error, setError] = useState(false);
  const onError = useCallback(() => setError(true), []);
  return <View style={{ gap: 8 }}><AppText>{text}</AppText>
    <LocationAttribution />
    <Button label={t('location.viewMap')} variant="secondary" onPress={() => setOpen(v => !v)} />
    {open && <><View style={{height:240}}><LocationMap point={point} onError={onError} /></View>{error && <AppText tone="error">{t('location.mapError')}</AppText>}</>}
  </View>;
}
