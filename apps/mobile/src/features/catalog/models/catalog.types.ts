export type CatalogLocale = 'vi' | 'en' | 'ja';
export interface Category { id: string; code: string; name_vi: string; name: string; name_locale: CatalogLocale; parent_id: string | null; active: boolean }
export interface Skill { id: string; code: string; name_vi: string; name: string; name_locale: CatalogLocale; schema_version: number; form_schema: Record<string, unknown>; category_ids: string[] }
export interface Page<T> { items: T[]; next_cursor: string | null }
export interface CatalogApi {
  categories(parentId?: string, signal?: AbortSignal, locale?: CatalogLocale): Promise<Category[]>;
  skills(categoryId: string, signal?: AbortSignal, locale?: CatalogLocale): Promise<Skill[]>;
}
