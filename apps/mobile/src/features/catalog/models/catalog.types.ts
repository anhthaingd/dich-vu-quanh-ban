export interface Category { id: string; code: string; name_vi: string; parent_id: string | null; active: boolean }
export interface Skill { id: string; code: string; name_vi: string; schema_version: number; form_schema: Record<string, unknown>; category_ids: string[] }
export interface Page<T> { items: T[]; next_cursor: string | null }
export interface CatalogApi {
  categories(parentId?: string, signal?: AbortSignal): Promise<Category[]>;
  skills(categoryId: string, signal?: AbortSignal): Promise<Skill[]>;
}
