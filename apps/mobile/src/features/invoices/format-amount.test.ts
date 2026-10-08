import {formatInteger} from './format-amount';

test.each(['vi', 'en', 'ja'])('formats VND without BigInt Intl or precision loss: %s', locale => {
  expect(formatInteger('250000', locale, true)).toBe(new Intl.NumberFormat(locale, {style:'currency', currency:'VND', maximumFractionDigits:0}).format(250000));
  expect(formatInteger('-250000', locale, true)).toBe(new Intl.NumberFormat(locale, {style:'currency', currency:'VND', maximumFractionDigits:0}).format(-250000));
  expect(formatInteger('900719925474099312345', locale).replace(/\D/g,'')).toBe('900719925474099312345');
  expect(formatInteger('0', locale)).toBe('0');
});
