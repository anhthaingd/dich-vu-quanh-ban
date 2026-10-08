// Hermes Intl accepts Number but not BigInt. Keep monetary digits as text;
// use Intl only for the locale's separators, sign and currency placement.
export function formatInteger(value: string, locale: string, currency = false): string {
  if (!/^-?\d+$/.test(value)) throw new Error('Expected integer');
  const negative = value.startsWith('-');
  const digits = value.replace(/^-/, '').replace(/^0+(?=\d)/, '');
  const formatter = new Intl.NumberFormat(locale, currency
    ? {style: 'currency', currency: 'VND', maximumFractionDigits: 0}
    : {maximumFractionDigits: 0});
  const group = formatter.format(1000).match(/1([^0-9]*)000/)?.[1] ?? ',';
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, group);
  return formatter.format(negative ? -1 : 1).replace('1', grouped);
}
