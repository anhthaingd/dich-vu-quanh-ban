export interface Config { databaseUrl: string; cursorSecret: string; port: number; host: string; corsOrigin?: string }
export function config(env = process.env): Config {
  if (!env.DATABASE_URL || !env.CURSOR_SECRET || env.CURSOR_SECRET.length < 32) {
    throw new Error('DATABASE_URL and CURSOR_SECRET (at least 32 characters) are required');
  }
  const url = new URL(env.DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Invalid database protocol');
  const port = Number(env.PORT ?? 3100);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  return { databaseUrl: env.DATABASE_URL, cursorSecret: env.CURSOR_SECRET, port, host: env.HOST ?? '127.0.0.1', corsOrigin: env.CORS_ORIGIN };
}
