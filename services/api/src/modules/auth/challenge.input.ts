import { BadRequestException } from '@nestjs/common';
import { identifier, object } from '../accounts/accounts.input.js';
export function contactInput(value: unknown) {
 if(typeof value!=='string') throw new BadRequestException();
 const contact=value.trim().toLowerCase();
 if(contact.length>254 || !(/^\+[1-9]\d{7,14}$/.test(contact) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) || /[\r\n]/.test(contact)) throw new BadRequestException();
 return {contact,provider:contact.startsWith('+')?'phone':'email'};
}
export function challengeInput(value:unknown) {
 const v=object(value,['contact','purpose']); if(v.purpose!=='verify') throw new BadRequestException();
 return {...contactInput(v.contact),purpose:'verify' as const};
}
export function verifyInput(value:unknown) {
 const v=object(value,['challenge_id','code']); if(typeof v.code!=='string'||!/^\d{6}$/.test(v.code)) throw new BadRequestException();
 return {challenge_id:identifier(v.challenge_id),code:v.code};
}
export function passwordInput(value:unknown) {
 const v=object(value,['password']); if(typeof v.password!=='string'||!v.password||Array.from(v.password).length>128) throw new BadRequestException();
 return v.password.normalize('NFC');
}
