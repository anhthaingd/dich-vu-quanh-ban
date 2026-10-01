import { BadRequestException } from '@nestjs/common';
function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !keys.includes(k))) throw new BadRequestException();
  return value as Record<string, unknown>;
}
export function credentials(value: unknown, register = false) {
  const body = object(value, register ? ['email','password','display_name'] : ['email','password']);
  if (typeof body.email !== 'string' || typeof body.password !== 'string') throw new BadRequestException();
  const email = body.email.trim().toLowerCase();
  const password = body.password.normalize('NFC');
  const size = Array.from(password).length;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || size < (register ? 15 : 1) || size > 128) throw new BadRequestException();
  const name = typeof body.display_name === 'string' ? body.display_name.trim() : '';
  if (register && (!name || name.length > 100 || Array.from(name).some(char => char.charCodeAt(0) < 32))) throw new BadRequestException();
  return { email, password, name };
}
export function refreshInput(value: unknown) {
  const body = object(value, ['refresh_token']);
  if (typeof body.refresh_token !== 'string' || !/^[a-f0-9]{64}$/.test(body.refresh_token)) throw new BadRequestException();
  return body.refresh_token;
}
