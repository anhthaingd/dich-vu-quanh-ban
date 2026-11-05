import {BadRequestException} from '@nestjs/common';
import {object} from '../accounts/accounts.input.js';
import {contactInput} from '../auth/challenge.input.js';
import {text} from '../moderation/moderation.input.js';
import {permissions} from './backoffice.input.js';
export function adminInvitationInput(value:unknown){
 const v=object(value,['name','email','permissions','reason']),contact=contactInput(v.email);
 if(contact.provider!=='email'||!Array.isArray(v.permissions)||!v.permissions.length||v.permissions.some(p=>!permissions.includes(p))||new Set(v.permissions).size!==v.permissions.length)throw new BadRequestException();
 return {name:text(v.name,100),email:contact.contact,permissions:(v.permissions as string[]).sort(),reason:text(v.reason,1000)};
}
