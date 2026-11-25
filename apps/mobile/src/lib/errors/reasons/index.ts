import type { Locale } from '../../i18n';
import { commonReasons } from './common';
import { authReasons } from './auth';
import { partnersReasons } from './partners';
import { jobsReasons } from './jobs';
import { chatReasons } from './chat';
import { financeReasons } from './finance';
import { organizationsReasons } from './organizations';
import { adminReasons } from './admin';
export const reasonCatalogs = [commonReasons, authReasons, partnersReasons, jobsReasons, chatReasons, financeReasons, organizationsReasons, adminReasons];
const merged = Object.fromEntries((['vi', 'en', 'ja'] as const).map(locale => [locale, Object.assign({}, ...reasonCatalogs.map(c => c[locale]))])) as Record<Locale, Record<string, string>>;
export function reasonMessage(locale: Locale, reason: string | undefined): string | undefined {
  if (!reason) return undefined;
  return Object.prototype.hasOwnProperty.call(merged[locale], reason) ? merged[locale][reason] : Object.prototype.hasOwnProperty.call(merged.vi, reason) ? merged.vi[reason] : undefined;
}
