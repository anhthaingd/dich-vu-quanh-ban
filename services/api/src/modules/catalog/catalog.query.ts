import { BadRequestException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export interface CatalogQuery { limit: number; cursor?: string; filter?: string }
export function parseQuery(query: Record<string, unknown>, kind: 'categories' | 'skills'): CatalogQuery {
  const filterKey = kind === 'categories' ? 'parent_id' : 'category_id';
  const allowed = new Set(['limit', 'cursor', filterKey]);
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
  return { limit, cursor, filter: filter?.toLowerCase() };
}
type Position = { created_at: string; id: string };
export class Cursor {
  constructor(private readonly secret: string) {}
  encode(position: Position, scope: string): string {
    const body = Buffer.from(JSON.stringify({ ...position, scope })).toString('base64url');
    return `${body}.${this.sign(body)}`;
  }
  decode(token: string | undefined, scope: string): Position | null {
    if (!token) return null;
    try {
      const [body, signature, extra] = token.split('.');
      if (!body || !signature || extra || !/^[A-Za-z0-9_-]+$/.test(body)) throw new Error();
      const expected = Buffer.from(this.sign(body));
      const actual = Buffer.from(signature);
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error();
      const value = JSON.parse(Buffer.from(body, 'base64url').toString());
      if (value.scope !== scope || !uuid.test(value.id) || typeof value.created_at !== 'string' || !Number.isFinite(Date.parse(value.created_at))) throw new Error();
      return { id: value.id, created_at: value.created_at };
    } catch { throw new BadRequestException('Cursor không hợp lệ cho bộ lọc này.'); }
  }
  private sign(body: string) { return createHmac('sha256', this.secret).update(body).digest('base64url'); }
}
