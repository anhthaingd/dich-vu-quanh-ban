import { BadRequestException } from '@nestjs/common';
import { uuid } from '../../logging/sanitize.js';
export type ProfileEdit = { expected_version: number; display_name?: string; locale?: 'vi' | 'en' | 'ja' };
export function profileInput(value: unknown, key: string | undefined): { input: ProfileEdit; key: string } {
  if (!key || !uuid.test(key) || !value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException();
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some(k => !['expected_version', 'display_name', 'locale'].includes(k))
    || !Number.isSafeInteger(body.expected_version) || Number(body.expected_version) < 1
    || ('locale' in body && !['vi','en','ja'].includes(body.locale as string))) throw new BadRequestException();
  const input: ProfileEdit = { expected_version: Number(body.expected_version) };
  if ('display_name' in body) {
    if (typeof body.display_name !== 'string') throw new BadRequestException();
    const name = body.display_name.trim();
    if (!name || name.length > 100 || Array.from(name).some(char => char.charCodeAt(0) < 32)) throw new BadRequestException();
    input.display_name = name;
  }
  if ('locale' in body) input.locale = body.locale as ProfileEdit['locale'];
  return { input, key: key.toLowerCase() };
}
