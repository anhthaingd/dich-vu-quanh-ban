import {useLocale} from '../../../app/providers/LocaleProvider';
import {AppText} from '../../../components/ui/AppText';
import type {ApiErrorCode} from '../../../lib/http/api-error';
export function TeamFeedback({error}:{error:ApiErrorCode|null}){
 const {t}=useLocale();if(!error)return null;
 const key=error==='RATE_LIMITED'?'rate':error==='CHALLENGE_INVALID'?'invalidCode':error==='CHALLENGE_EXPIRED'?'expiredCode':error==='REAUTH_REQUIRED'?'reauthRequired':error==='FORBIDDEN'||error==='NOT_FOUND'?'denied':error==='VERSION_CONFLICT'||error==='STATE_CONFLICT'?'conflict':error==='VALIDATION'?'invalid':'error';
 return <AppText accessibilityRole="alert" tone="error">{t(`team.${key}`)}</AppText>;
}
