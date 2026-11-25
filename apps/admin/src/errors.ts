// Error messages for the admin console. The exact-cause (`reason`) and category
// texts are the mobile app's catalogs, imported as plain TS (they only have type
// imports), so both clients say the same thing for the same API error.
import {reasonMessage} from '../../mobile/src/lib/errors/reasons/index';
import {categoryMessages} from '../../mobile/src/lib/errors/categories';
import {ClientError} from './client';

export type Locale='vi'|'en'|'ja';
/** What panels keep in state after a failure: codes only, never translated text. */
export type ErrorInfo={code:string;reason?:string;field?:string;requestId?:string;status?:number;timeout?:boolean};
/** Message for a category when the API sent no known reason. Undefined defers to the category text. */
export type PanelText=(category:string)=>string|undefined;

const locales:Locale[]=['vi','en','ja'];
const asLocale=(locale:string):Locale=>locales.includes(locale as Locale)?locale as Locale:'vi';
const has=(o:object,k:string)=>Object.prototype.hasOwnProperty.call(o,k);
// The mobile wording mentions mobile data and app updates; the console is a web page.
const web:Record<Locale,Record<string,string>>={
 vi:{NETWORK:'Không kết nối được tới máy chủ. Kiểm tra mạng rồi thử lại.',INVALID_RESPONSE:'Máy chủ trả dữ liệu không đúng định dạng. Tải lại trang hoặc thử lại sau.'},
 en:{NETWORK:'Cannot reach the server. Check your network and try again.',INVALID_RESPONSE:'The server sent data in an unexpected format. Reload the page or try again later.'},
 ja:{NETWORK:'サーバーに接続できません。ネットワークを確認して、もう一度お試しください。',INVALID_RESPONSE:'サーバーから想定外の形式のデータが届きました。ページを再読み込みするか、後でもう一度お試しください。'},
};
const referenceLabel:Record<Locale,string>={vi:'Mã tra cứu',en:'Reference code',ja:'照会コード'};
const byStatus:Record<number,string>={400:'VALIDATION',401:'UNAUTHENTICATED',403:'FORBIDDEN',404:'NOT_FOUND',409:'CONFLICT',413:'PAYLOAD_TOO_LARGE',422:'UNPROCESSABLE',429:'RATE_LIMITED',500:'INTERNAL',502:'SERVICE_UNAVAILABLE',503:'SERVICE_UNAVAILABLE',504:'TIMEOUT'};
/** Outcomes the server may still have applied; keep the captured request so a retry is identical. */
export const uncertain=['NETWORK','TIMEOUT','SERVICE_UNAVAILABLE','INTERNAL','INVALID_RESPONSE'];
export const sessionEnded=(code:string)=>['FORBIDDEN','UNAUTHENTICATED','REAUTH_REQUIRED'].includes(code);
export const conflict=(info:ErrorInfo|null|undefined)=>!!info&&['VERSION_CONFLICT','STATE_CONFLICT'].includes(info.code);

export function toErrorInfo(error:unknown,fallback='NETWORK'):ErrorInfo{
 if(error instanceof ClientError)return {code:error.code,...(error.reason?{reason:error.reason}:{}),...(error.field?{field:error.field}:{}),...(error.requestId?{requestId:error.requestId}:{}),...(error.status?{status:error.status}:{}),...(error.timeout?{timeout:true}:{})};
 // Hooks throw `{code:'INVALID_RESPONSE'}` for malformed bodies.
 if(error&&typeof error==='object'&&typeof (error as {code?:unknown}).code==='string')return {code:(error as {code:string}).code};
 return {code:fallback};
}
const asInfo=(error:ErrorInfo|string):ErrorInfo=>typeof error==='string'?{code:error}:error;

/**
 * Category whose message fits the failure. `code` keeps the client's branching values
 * (e.g. NETWORK for an unreadable error page, FAILED for a photo download); the
 * category says what actually happened (gateway error, timeout, missing file...).
 */
export function errorCategory(error:ErrorInfo|string):string{
 const info=asInfo(error);
 if(info.timeout)return 'TIMEOUT';
 if((info.code==='NETWORK'||info.code==='FAILED')&&info.status)return byStatus[info.status]??(info.status>=500?'INTERNAL':'HTTP');
 return has(categoryMessages.vi,info.code)?info.code:'HTTP';
}

/** The API reason first, then the panel's text for this category, then the generic category text. */
export function errorText(locale:string,error:ErrorInfo|string,panel?:PanelText):string{
 const l=asLocale(locale),info=asInfo(error),category=errorCategory(info),messages=categoryMessages[l] as Record<string,string>;
 return reasonMessage(l,info.reason)??panel?.(category)??web[l][category]??messages[category]??messages.HTTP;
}

/** Short reference for unexpected server failures, so support can find the log line. */
export function errorReference(error:ErrorInfo|string):string|undefined{
 const info=asInfo(error);
 return info.requestId&&(['INTERNAL','SERVICE_UNAVAILABLE','TIMEOUT','HTTP','INVALID_RESPONSE'].includes(errorCategory(info))||(info.status??0)>=500)?info.requestId.slice(0,8).toUpperCase():undefined;
}
export const referenceText=(locale:string,reference:string)=>referenceLabel[asLocale(locale)]+': '+reference;
/** Marks the input the API named as wrong (`field_errors[0].field`). */
export const invalid=(info:ErrorInfo|null|undefined,...fields:string[])=>info?.field&&fields.includes(info.field)?true:undefined;

/**
 * Console context for a category: a lost response on a pending write is "unconfirmed,
 * retry the same request"; conflicts ask to reload; ended sessions ask to verify again.
 * Everything else defers to the precise category message.
 */
export const consolePanel=(t:(key:string)=>string,write=false):PanelText=>category=>
 write&&(category==='NETWORK'||category==='TIMEOUT')?t('network')
 :category==='VERSION_CONFLICT'||category==='STATE_CONFLICT'?t('conflict')
 :sessionEnded(category)?t('forbidden'):undefined;
