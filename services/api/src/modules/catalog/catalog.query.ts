import { BadRequestException } from '@nestjs/common';
export { Cursor } from '../../common/http/cursor.js';

export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type CatalogLocale = 'vi' | 'en' | 'ja';
export interface CatalogQuery { limit: number; cursor?: string; filter?: string; locale: CatalogLocale }
export function parseQuery(query: Record<string, unknown>, kind: 'categories' | 'skills'): CatalogQuery {
  const filterKey = kind === 'categories' ? 'parent_id' : 'category_id';
  const allowed = new Set(['limit', 'cursor', 'locale', filterKey]);
  for (const [key, value] of Object.entries(query)) {
    if (!allowed.has(key) || typeof value !== 'string') throw new BadRequestException('Tham số không hợp lệ.');
  }
  const limitText = query.limit as string | undefined;
  const limit = limitText === undefined ? 20 : Number(limitText);
  if ((limitText !== undefined && !/^\d+$/.test(limitText)) || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new BadRequestException('limit phải từ 1 đến 100.');
  const filter = query[filterKey] as string | undefined;
  if (filter !== undefined && !(kind === 'categories' && filter === 'root') && !uuid.test(filter)) throw new BadRequestException(`${filterKey} không hợp lệ.`);
  const cursor = query.cursor as string | undefined;
  if (cursor !== undefined && (cursor.length === 0 || cursor.length > 1024)) throw new BadRequestException('Cursor không hợp lệ.');
  const locale = query.locale ?? 'vi';
  if (locale !== 'vi' && locale !== 'en' && locale !== 'ja') throw new BadRequestException('locale không hợp lệ.');
  return { limit, cursor, filter: filter?.toLowerCase(), locale };
}
