import { object } from '../accounts/accounts.input.js';
import { pointInput, type Point } from '../partners/partners.input.js';
import { invalid } from '../partners/partners.errors.js';
export type LocationAction = 'autocomplete' | 'geocode' | 'reverse';
export type LocationInput = { locale:'vi'|'en'|'ja'; text?:string; bias?:Point; point?:Point };
export type LocationResult = { id:string; text:string; point:Point; precision:'address'|'approximate' };
export const attribution = 'Powered by Geoapify | © OpenStreetMap contributors';
export type LocationResponse = { items:LocationResult[]; attribution:string } | { address:LocationResult|null; attribution:string };
export function locationInput(action:LocationAction, body:unknown):LocationInput {
  const v=object(body,action==='reverse'?['point','locale']:['text','locale','bias']);
  if(!['vi','en','ja'].includes(String(v.locale)))throw invalid('LOCALE_INVALID','locale');
  const locale=v.locale as LocationInput['locale'];
  if(action==='reverse')return {point:pointInput(v.point,'LOCATION_POINT_INVALID','point'),locale};
  if(typeof v.text!=='string')throw invalid('LOCATION_QUERY_INVALID','text');
  if(v.text.trim().length<3)throw invalid('LOCATION_QUERY_TOO_SHORT','text');
  if(v.text.length>300)throw invalid('LOCATION_QUERY_TOO_LONG','text');
  if(Array.from(v.text).some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127))throw invalid('LOCATION_QUERY_INVALID','text');
  return {text:v.text.trim(),locale,...(v.bias===undefined?{}:{bias:pointInput(v.bias,'LOCATION_POINT_INVALID','bias')})};
}
