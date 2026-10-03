import { I18n } from 'i18n-js';
import { vi } from './messages/vi';
import { en } from './messages/en';
import { ja } from './messages/ja';
export const locales = ['vi', 'en', 'ja'] as const;
export type Locale = typeof locales[number];
export const localeNames: Record<Locale, string> = { vi: 'Tiếng Việt', en: 'English', ja: '日本語' };
export const isLocale = (value: unknown): value is Locale => locales.some(locale => locale === value);
export const messages = { vi, en, ja };
type Source = typeof vi;
export type MessageKey = { [G in keyof Source]: `${G}.${keyof Source[G] & string}` }[keyof Source];
type Value<K extends MessageKey> = K extends `${infer G extends keyof Source}.${infer M}` ? M extends keyof Source[G] ? Source[G][M] : never : never;
type Placeholders<S> = S extends `${string}%{${infer P}}${infer Rest}` ? P | Placeholders<Rest> : never;
type Args<K extends MessageKey> = Value<K> extends string
  ? [Placeholders<Value<K>>] extends [never] ? [] : [params: Record<Placeholders<Value<K>>, string | number>]
  : [params: { count: number }];
export type Translate = <K extends MessageKey>(key: K, ...args: Args<K>) => string;

// A translator belongs to one locale. No shared mutable locale between roots/tests.
export function createTranslator(locale: Locale, dictionaries: ConstructorParameters<typeof I18n>[0] = messages): Translate {
  const i18n = new I18n(dictionaries, { locale, defaultLocale: 'vi', enableFallback: true });
  // i18n-js supplies English one/other. VI and JA have only the CLDR
  // 'other' cardinal category; avoid Intl.PluralRules (absent in this Hermes).
  for (const language of ['vi', 'ja']) i18n.pluralization.register(language, () => ['other']);
  return <K extends MessageKey>(key: K, ...args: Args<K>) => i18n.t(key, args[0]);
}
