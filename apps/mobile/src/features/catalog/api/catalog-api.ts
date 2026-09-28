import type { CatalogApi, Category, Page, Skill } from '../models/catalog.types';
import { requestJson } from '../../../lib/http/request';
import { ApiError } from '../../../lib/http/api-error';
function validItem(value: unknown, kind: 'categories' | 'skills'): boolean {
  if (!value || typeof value !== 'object') return false;
  const x = value as Record<string, unknown>;
  if (![x.id,x.code,x.name_vi].every(v => typeof v === 'string' && v.length > 0)) return false;
  return kind === 'categories' ? typeof x.active === 'boolean' && (x.parent_id === null || typeof x.parent_id === 'string') : Number.isInteger(x.schema_version) && Number(x.schema_version) > 0 && !!x.form_schema && typeof x.form_schema === 'object' && !Array.isArray(x.form_schema) && Array.isArray(x.category_ids) && x.category_ids.every(id => typeof id === 'string');
}
export function createCatalogApi(baseUrl: string | undefined, request: typeof fetch = fetch): CatalogApi {
  async function all<T>(path: 'categories' | 'skills', filter: string, signal?: AbortSignal): Promise<T[]> {
    if (!baseUrl || !/^https?:\/\//.test(baseUrl)) throw new ApiError('CONFIG');
    const items: T[] = [];
    const seen = new Set<string>();
    let cursor: string | null = null;
    do {
      const value = await requestJson(`${baseUrl.replace(/\/$/, '')}/${path}?limit=100&${filter}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, request, signal, undefined, value => {
        const data = value as Page<T> | null;
        return !!data && Array.isArray(data.items) && data.items.every(x => validItem(x, path)) && (data.next_cursor === null || (typeof data.next_cursor === 'string' && data.next_cursor.length > 0 && data.next_cursor.length <= 1024 && !seen.has(data.next_cursor)));
      });
      const data = value as Page<T>;
      items.push(...data.items); cursor = data.next_cursor;
      if (cursor) seen.add(cursor);
    } while (cursor);
    return items;
  }
  return {
    categories: (parentId = 'root', signal) => all<Category>('categories', `parent_id=${encodeURIComponent(parentId)}`, signal),
    skills: (categoryId, signal) => all<Skill>('skills', `category_id=${encodeURIComponent(categoryId)}`, signal),
  };
}
