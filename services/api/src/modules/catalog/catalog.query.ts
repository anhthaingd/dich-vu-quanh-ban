import { BadRequestException } from '@nestjs/common';
export { Cursor } from '../../common/http/cursor.js';

export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type CatalogLocale = 'vi' | 'en' | 'ja';
export interface CatalogQuery { limit: number; cursor?: string; filter?: string; locale: CatalogLocale }
export function parseQuery(query: Record<string, unknown>, kind: 'categories' | 'skills'): CatalogQuery {
  const filterKey = kind === 'categories' ? 'parent_id' : 'category_id';
  const allowed = new Set(['limit', 'cursor', 'locale', filterKey]);
  for (const [key, value] of Object.entries(query)) {
    // Unknown keys are user input: never echo them back as `field`.
    if (!allowed.has(key)) throw new BadRequestException({ reason: 'CATALOG_FILTER_UNKNOWN' });
    if (typeof value !== 'string') throw new BadRequestException({ reason: 'CATALOG_FILTER_REPEATED', field: key });
  }
  const limitText = query.limit as string | undefined;
  const limit = limitText === undefined ? 20 : Number(limitText);
  if ((limitText !== undefined && !/^\d+$/.test(limitText)) || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new BadRequestException({ reason: 'LIMIT_INVALID', field: 'limit' });
  const filter = query[filterKey] as string | undefined;
  if (filter !== undefined && !(kind === 'categories' && filter === 'root') && !uuid.test(filter)) throw new BadRequestException({ reason: kind === 'categories' ? 'CATALOG_PARENT_INVALID' : 'CATALOG_CATEGORY_INVALID', field: filterKey });
  const cursor = query.cursor as string | undefined;
  if (cursor !== undefined && (cursor.length === 0 || cursor.length > 1024)) throw new BadRequestException({ reason: 'CURSOR_INVALID', field: 'cursor' });
  const locale = query.locale ?? 'vi';
  if (locale !== 'vi' && locale !== 'en' && locale !== 'ja') throw new BadRequestException({ reason: 'LOCALE_INVALID', field: 'locale' });
  return { limit, cursor, filter: filter?.toLowerCase(), locale };
}
