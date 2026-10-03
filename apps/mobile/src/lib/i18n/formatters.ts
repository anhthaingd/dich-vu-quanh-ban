import type { Locale } from './index';
// Locale changes presentation, never the business currency or timezone.
export const formatVnd = (amount: number, locale: Locale) => new Intl.NumberFormat(locale, {
  style: 'currency', currency: 'VND', maximumFractionDigits: 0,
}).format(amount);
export const formatBusinessDate = (date: Date, locale: Locale) => new Intl.DateTimeFormat(locale, {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).format(date);
