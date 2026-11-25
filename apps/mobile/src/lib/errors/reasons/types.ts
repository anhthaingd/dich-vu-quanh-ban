import type { Locale } from '../../i18n';
// One exact message per API `reason` (UPPER_SNAKE). Every locale has the same keys.
export type ReasonCatalog<K extends string = string> = Record<Locale, Record<K, string>>;
export const catalog = <K extends string>(value: ReasonCatalog<K>) => value;
