import { BadRequestException } from '@nestjs/common';
import { uuid } from '../../logging/sanitize.js';
export type ProfileEdit = { expected_version: number; display_name?: string; locale?: 'vi' | 'en' | 'ja' };
const invalid = (reason: string, field?: string) => new BadRequestException({ reason, ...(field ? { field } : {}) });
export function profileInput(value: unknown, key: string | undefined): { input: ProfileEdit; key: string } {
  if (!key || !uuid.test(key)) throw invalid('IDEMPOTENCY_KEY_REQUIRED');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid('REQUEST_SHAPE_INVALID');
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some(k => !['expected_version', 'display_name', 'locale'].includes(k))) throw invalid('REQUEST_SHAPE_INVALID');
  if (!Number.isSafeInteger(body.expected_version) || Number(body.expected_version) < 1) throw invalid('EXPECTED_VERSION_REQUIRED', 'expected_version');
  if ('locale' in body && !['vi','en','ja'].includes(body.locale as string)) throw invalid('LOCALE_INVALID', 'locale');
  const input: ProfileEdit = { expected_version: Number(body.expected_version) };
  if ('display_name' in body) {
    if (typeof body.display_name !== 'string') throw invalid('PROFILE_NAME_REQUIRED', 'display_name');
    const name = body.display_name.trim();
    if (!name) throw invalid('PROFILE_NAME_REQUIRED', 'display_name');
    if (name.length > 100) throw invalid('PROFILE_NAME_TOO_LONG', 'display_name');
    if (Array.from(name).some(char => char.charCodeAt(0) < 32)) throw invalid('PROFILE_NAME_INVALID', 'display_name');
    input.display_name = name;
  }
  if ('locale' in body) input.locale = body.locale as ProfileEdit['locale'];
  return { input, key: key.toLowerCase() };
}
