import {ApiError,type ApiErrorCode} from '../../../lib/http/api-error';
import {toErrorInfo,type ErrorInfo} from '../../../lib/errors/describe';
export type Translate=(key:string)=>string;
export type {ErrorInfo};
/** Category used for branching (session ends, retries, reload buttons). */
export const codeOf=(e:unknown)=>e instanceof ApiError?e.code:'NETWORK';
/** What admin screens keep in state after a failure: code, exact reason, field and request id; never text. */
export const infoOf=(e:unknown):ErrorInfo=>toErrorInfo(e);
/** Outcomes the server may still have applied: keep the captured request so the retry is identical. */
export const uncertain=(code:string)=>['NETWORK','TIMEOUT','SERVICE_UNAVAILABLE','INTERNAL','INVALID_RESPONSE'].includes(code);
export const sessionEnded=(code:string)=>['FORBIDDEN','UNAUTHENTICATED','REAUTH_REQUIRED'].includes(code);
/**
 * Admin context for a category when the API sent no known reason. `write` marks a pending
 * idempotent write whose result is unknown after a lost response. Undefined defers to the
 * precise category message (connection, server error, rate limit, validation...).
 */
export const adminScreen=(t:Translate,write=false)=>(code:ApiErrorCode):string|undefined=>
 write&&(code==='NETWORK'||code==='TIMEOUT')?t('network')
 :code==='VERSION_CONFLICT'||code==='STATE_CONFLICT'?t('conflict')
 :sessionEnded(code)?t('forbidden'):undefined;
