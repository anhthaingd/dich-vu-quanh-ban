import { ApiError } from '../http/api-error';
import { errorReference, errorText, toErrorInfo } from './describe';
import { categoryMessages } from './categories';
import { reasonCatalogs } from './reasons';

test('reason message wins over screen and category messages', () => {
  const info = toErrorInfo(new ApiError('VALIDATION', 400, undefined, undefined, undefined, 'CURSOR_INVALID', 'cursor'));
  expect(info).toEqual({ code: 'VALIDATION', reason: 'CURSOR_INVALID', field: 'cursor' });
  expect(errorText('vi', info, () => 'screen')).not.toBe('screen');
  expect(errorText('vi', { code: 'VALIDATION', reason: 'UNKNOWN_REASON' }, () => 'screen')).toBe('screen');
  expect(errorText('en', 'FORBIDDEN', () => undefined)).toBe(categoryMessages.en.FORBIDDEN);
  expect(toErrorInfo(new Error('x'))).toEqual({ code: 'NETWORK' });
});
test('reference code is shown only for unexpected server failures', () => {
  expect(errorReference({ code: 'INTERNAL', requestId: 'd28753c2-a88f-4eb5-9df1-e7c8fdfe604c' })).toBe('D28753C2');
  expect(errorReference({ code: 'VALIDATION', requestId: 'd28753c2-a88f-4eb5-9df1-e7c8fdfe604c' })).toBeUndefined();
});
test('every reason catalog has the same keys in vi, en and ja', () => {
  for (const c of reasonCatalogs) {
    const keys = Object.keys(c.vi).sort();
    expect(Object.keys(c.en).sort()).toEqual(keys);
    expect(Object.keys(c.ja).sort()).toEqual(keys);
    for (const locale of ['vi', 'en', 'ja'] as const) for (const k of keys) expect((c[locale] as Record<string, string>)[k].trim()).not.toBe('');
  }
  const all = reasonCatalogs.flatMap(c => Object.keys(c.vi));
  expect(new Set(all).size).toBe(all.length);
  for (const k of all) expect(k).toMatch(/^[A-Z][A-Z0-9_]{1,63}$/);
});
