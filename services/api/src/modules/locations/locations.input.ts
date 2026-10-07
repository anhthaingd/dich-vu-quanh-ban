import { BadRequestException } from '@nestjs/common';
import { object } from '../accounts/accounts.input.js';
import { pointInput, type Point } from '../partners/partners.input.js';
export type LocationAction = 'autocomplete' | 'geocode' | 'reverse';
export type LocationInput = { locale:'vi'|'en'|'ja'; text?:string; bias?:Point; point?:Point };
export type LocationResult = { id:string; text:string; point:Point; precision:'address'|'approximate' };
export const attribution = 'Powered by Geoapify | © OpenStreetMap contributors';
export type LocationResponse = { items:LocationResult[]; attribution:string } | { address:LocationResult|null; attribution:string };
export function locationInput(action:LocationAction, body:unknown):LocationInput {
  const v=object(body,action==='reverse'?['point','locale']:['text','locale','bias']);
  if(!['vi','en','ja'].includes(String(v.locale)))throw new BadRequestException();
  const locale=v.locale as LocationInput['locale'];
  if(action==='reverse')return {point:pointInput(v.point),locale};
  if(typeof v.text!=='string'||v.text.trim().length<3||v.text.length>300||Array.from(v.text).some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127))throw new BadRequestException();
  return {text:v.text.trim(),locale,...(v.bias===undefined?{}:{bias:pointInput(v.bias)})};
}
