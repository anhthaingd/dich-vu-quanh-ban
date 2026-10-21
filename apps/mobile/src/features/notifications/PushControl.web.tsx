import {AppText} from '../../components/ui/AppText';
import {useLocale} from '../../app/providers/LocaleProvider';
export function PushControl(_props:{owner:string}){void _props;const {t}=useLocale();return <AppText>{t('push.nativeOnly')}</AppText>;}
