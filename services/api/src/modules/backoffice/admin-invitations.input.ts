import {contactInput} from '../auth/challenge.input.js';
import {body,invalid,reasonRule,rethrow,text,version} from '../moderation/moderation.input.js';
import {permissions} from './backoffice.input.js';
export function adminInvitationInput(value:unknown){
 const v=body(value,['name','email','permissions','reason']),contact=rethrow('ADMIN_INVITE_EMAIL_INVALID','email',()=>contactInput(v.email));
 if(contact.provider!=='email')throw invalid('ADMIN_INVITE_EMAIL_INVALID','email');
 if(!Array.isArray(v.permissions)||!v.permissions.length)throw invalid('ADMIN_PERMISSIONS_REQUIRED','permissions');
 if(v.permissions.some(p=>!permissions.includes(p))||new Set(v.permissions).size!==v.permissions.length)throw invalid('ADMIN_PERMISSIONS_INVALID','permissions');
 return {name:text(v.name,100,{prefix:'ADMIN_INVITEE_NAME',field:'name'}),email:contact.contact,permissions:(v.permissions as string[]).sort(),reason:text(v.reason,1000,reasonRule)};
}
// Same rules as organizations changeInput/tokenInput, with admin-specific reasons.
export function invitationChangeInput(value:unknown){const v=body(value,['expected_version','reason']);return {expected_version:version(v.expected_version),reason:text(v.reason,1000,reasonRule)};}
export function invitationTokenInput(value:unknown){const v=body(value,['token']);if(typeof v.token!=='string'||!/^[a-f0-9]{64}$/.test(v.token))throw invalid('ADMIN_INVITATION_CODE_FORMAT_INVALID','token');return v.token;}
