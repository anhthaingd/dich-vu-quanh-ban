import { BadRequestException } from '@nestjs/common';
import { identifier, object } from '../accounts/accounts.input.js';
const invalid = (reason: string, field: string) => new BadRequestException({ reason, field });
/** Email or E.164 phone. `field` names the body key the contact came from. */
export function contactInput(value: unknown, field = 'contact') {
 if(typeof value!=='string' || !value.trim()) throw invalid('CONTACT_REQUIRED', field);
 const contact=value.trim().toLowerCase();
 if(contact.length>254 || !(/^\+[1-9]\d{7,14}$/.test(contact) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) || /[\r\n]/.test(contact)) throw invalid('CONTACT_INVALID', field);
 return {contact,provider:contact.startsWith('+')?'phone':'email'};
}
export function challengeInput(value:unknown) {
 const v=object(value,['contact','purpose']); if(v.purpose!=='verify') throw invalid('CHALLENGE_PURPOSE_INVALID', 'purpose');
 return {...contactInput(v.contact),purpose:'verify' as const};
}
export function verifyInput(value:unknown) {
 const v=object(value,['challenge_id','code']); if(typeof v.code!=='string'||!/^\d{6}$/.test(v.code)) throw invalid('CODE_FORMAT_INVALID', 'code');
 return {challenge_id:identifier(v.challenge_id,'ID_INVALID','challenge_id'),code:v.code};
}
export function passwordInput(value:unknown) {
 const v=object(value,['password']); if(typeof v.password!=='string'||!v.password) throw invalid('AUTH_PASSWORD_REQUIRED', 'password');
 if(Array.from(v.password).length>128) throw invalid('AUTH_PASSWORD_TOO_LONG', 'password');
 return v.password.normalize('NFC');
}
