import { BadRequestException } from '@nestjs/common';
import { object } from '../accounts/accounts.input.js';
// B00-32 (owner decision 12/11/2026): new passwords need at least 8 characters (was 15), at most 128.
export const PASSWORD_MIN = 8;
const invalid = (reason: string, field: string) => new BadRequestException({ reason, field });
export function credentials(value: unknown, register = false) {
  const body = object(value, register ? ['email','password','display_name'] : ['email','password']);
  if (typeof body.email !== 'string') throw invalid('AUTH_EMAIL_INVALID', 'email');
  if (typeof body.password !== 'string') throw invalid('AUTH_PASSWORD_REQUIRED', 'password');
  const email = body.email.trim().toLowerCase();
  const password = body.password.normalize('NFC');
  const size = Array.from(password).length;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw invalid('AUTH_EMAIL_INVALID', 'email');
  if (size < (register ? PASSWORD_MIN : 1)) throw invalid(register ? 'AUTH_PASSWORD_TOO_SHORT' : 'AUTH_PASSWORD_REQUIRED', 'password');
  if (size > 128) throw invalid('AUTH_PASSWORD_TOO_LONG', 'password');
  const name = typeof body.display_name === 'string' ? body.display_name.trim() : '';
  if (register && !name) throw invalid('PROFILE_NAME_REQUIRED', 'display_name');
  if (register && name.length > 100) throw invalid('PROFILE_NAME_TOO_LONG', 'display_name');
  if (register && Array.from(name).some(char => char.charCodeAt(0) < 32)) throw invalid('PROFILE_NAME_INVALID', 'display_name');
  return { email, password, name };
}
export function refreshInput(value: unknown) {
  const body = object(value, ['refresh_token']);
  if (typeof body.refresh_token !== 'string' || !/^[a-f0-9]{64}$/.test(body.refresh_token)) throw invalid('AUTH_REFRESH_TOKEN_INVALID', 'refresh_token');
  return body.refresh_token;
}
