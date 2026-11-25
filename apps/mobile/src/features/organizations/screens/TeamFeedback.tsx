import {useLocale} from '../../../app/providers/LocaleProvider';
import {ErrorMessage} from '../../../components/ui/ErrorMessage';
import type {ApiErrorCode} from '../../../lib/http/api-error';
import type {ErrorInfo} from '../../../lib/errors/describe';
// Team wording for a category, used only when the API gave no known reason.
// Infrastructure codes return undefined so the precise category message shows.
export function teamErrorKey(code:ApiErrorCode):'team.rate'|'team.invalidCode'|'team.expiredCode'|'team.reauthRequired'|'team.denied'|'team.conflict'|'team.invalid'|undefined{
 switch(code){
  case 'RATE_LIMITED':return 'team.rate';
  case 'CHALLENGE_INVALID':return 'team.invalidCode';
  case 'CHALLENGE_EXPIRED':return 'team.expiredCode';
  case 'REAUTH_REQUIRED':return 'team.reauthRequired';
  case 'FORBIDDEN':case 'NOT_FOUND':return 'team.denied';
  case 'VERSION_CONFLICT':case 'STATE_CONFLICT':return 'team.conflict';
  case 'VALIDATION':return 'team.invalid';
  default:return undefined;
 }
}
export function TeamFeedback({error}:{error:ApiErrorCode|ErrorInfo|null}){
 const {t}=useLocale();
 return <ErrorMessage error={error} screen={code=>{const key=teamErrorKey(code);return key?t(key):undefined;}}/>;
}
