import {ApiError} from '../../../lib/http/api-error';
export type Translate=(key:string)=>string;
export const codeOf=(e:unknown)=>e instanceof ApiError?e.code:'NETWORK';
export function errorText(code:string,t:Translate){return t(['NETWORK','TIMEOUT','SERVICE_UNAVAILABLE','INVALID_RESPONSE'].includes(code)?'network':code==='RATE_LIMITED'?'rate':['VERSION_CONFLICT','STATE_CONFLICT'].includes(code)?'conflict':['FORBIDDEN','UNAUTHENTICATED','REAUTH_REQUIRED'].includes(code)?'forbidden':'failed');}
