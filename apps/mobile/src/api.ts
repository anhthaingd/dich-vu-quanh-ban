export interface Category { id: string; code: string; name_vi: string; parent_id: string | null; active: boolean }
export interface Skill { id: string; code: string; name_vi: string; schema_version: number; form_schema: Record<string, unknown>; category_ids: string[] }
interface Page<T> { items: T[]; next_cursor: string | null }
export interface CatalogApi {
  categories(parentId?: string, signal?: AbortSignal): Promise<Category[]>;
  skills(categoryId: string, signal?: AbortSignal): Promise<Skill[]>;
}
export function createCatalogApi(baseUrl: string | undefined, request: typeof fetch = fetch): CatalogApi {
  async function all<T>(path: string, filter: string, signal?: AbortSignal): Promise<T[]> {
    if (!baseUrl || !/^https?:\/\//.test(baseUrl)) throw new Error('Chưa cấu hình địa chỉ dịch vụ.');
    const items: T[] = [];
    const seen = new Set<string>();
    let cursor: string | null = null;
    do {
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) controller.abort();
      const timer = setTimeout(abort, 10000);
      try {
        const response = await request(`${baseUrl.replace(/\/$/, '')}/${path}?limit=100&${filter}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Không tải được danh mục. Vui lòng thử lại.');
        const data: Page<T> = await response.json();
        if (!Array.isArray(data.items) || !(data.next_cursor === null || typeof data.next_cursor === 'string')) throw new Error('Phản hồi dịch vụ không hợp lệ.');
        items.push(...data.items);
        cursor = data.next_cursor;
        if (cursor && seen.has(cursor)) throw new Error('Không thể tải tiếp danh mục.');
        if (cursor) seen.add(cursor);
      } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
    } while (cursor);
    return items;
  }
  return {
    categories: (parentId = 'root', signal) => all<Category>('categories', `parent_id=${encodeURIComponent(parentId)}`, signal),
    skills: (categoryId, signal) => all<Skill>('skills', `category_id=${encodeURIComponent(categoryId)}`, signal),
  };
}
