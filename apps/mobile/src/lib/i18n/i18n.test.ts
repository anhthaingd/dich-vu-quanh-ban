import { createTranslator, locales, messages } from './index';
import { formatBusinessDate, formatVnd } from './formatters';
function flatten(value: object, prefix = ''): Record<string, string> {
  return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof item === 'string' ? [[path, item]] : Object.entries(flatten(item, path));
  }));
}
test('every locale has the same complete keys and interpolation variables', () => {
  const source = flatten(messages.vi);
  const variables = (text: string) => [...text.matchAll(/%\{(\w+)\}/g)].map(match => match[1]).sort();
  for (const locale of locales) {
    const translated = flatten(messages[locale]);
    expect(Object.keys(translated).sort()).toEqual(Object.keys(source).sort());
    for (const key of Object.keys(source)) {
      expect(translated[key].trim()).not.toBe('');
      expect(variables(translated[key])).toEqual(variables(source[key]));
    }
  }
});
test('interpolation, English plurals, Japanese/Vietnamese and fallback work independently', () => {
  const en = createTranslator('en'), ja = createTranslator('ja'), vi = createTranslator('vi');
  expect(en('catalog.skills', { count: 0 })).toBe('0 skills');
  expect(en('catalog.skills', { count: 1 })).toBe('1 skill');
  expect(en('catalog.skills', { count: 2 })).toBe('2 skills');
  expect(ja('catalog.skills', { count: 1 })).toBe('1件のスキル');
  expect(vi('catalog.skills', { count: 2 })).toBe('2 kỹ năng');
  expect(ja('auth.passwordHint', { min: 15, max: 128 })).toContain('15〜128');
  const fallback = createTranslator('ja', { vi: messages.vi, ja: {} });
  expect(fallback('common.back')).toBe('Quay lại');
  expect(en('common.back')).toBe('Back');
});
test('formatters preserve VND and Vietnam time across all locales', () => {
  for (const locale of locales) {
    const currency = formatVnd(50000, locale);
    expect(currency).toMatch(/₫|VND/); expect(currency).not.toMatch(/USD|JPY|¥|\$/);
    expect(formatBusinessDate(new Date('2026-10-01T18:30:00Z'), locale)).toContain('01:30');
  }
});
test('translation works on Hermes runtimes without Intl.PluralRules', () => {
  const descriptor = Object.getOwnPropertyDescriptor(Intl, 'PluralRules')!;
  Object.defineProperty(Intl, 'PluralRules', { configurable: true, value: undefined });
  try {
    expect(createTranslator('en')('catalog.skills', { count: 1 })).toBe('1 skill');
    expect(createTranslator('ja')('catalog.skills', { count: 2 })).toBe('2件のスキル');
    expect(createTranslator('vi')('catalog.skills', { count: 0 })).toBe('0 kỹ năng');
  } finally { Object.defineProperty(Intl, 'PluralRules', descriptor); }
});
// These calls are intentionally never executed; tsc must reject each bad call.
function checkTypes() {
  const t = createTranslator('vi');
  // @ts-expect-error unknown key
  t('auth.missing');
  // @ts-expect-error required interpolation values
  t('auth.passwordHint');
  // @ts-expect-error missing max
  t('auth.passwordHint', { min: 15 });
  // @ts-expect-error count must be numeric
  t('catalog.skills', { count: 'two' });
  // @ts-expect-error no params for this message
  t('auth.login', { min: 1 });
}
void checkTypes;
