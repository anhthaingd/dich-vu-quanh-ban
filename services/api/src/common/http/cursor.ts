import { BadRequestException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { uuid } from '../../logging/sanitize.js';
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
