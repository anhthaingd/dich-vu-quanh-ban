export interface Config { databaseUrl: string; cursorSecret: string; authSecret?: string; port: number; host: string; corsOrigin?: string; geoapifyKey?: string }
export function config(env = process.env): Config {
  if (!env.DATABASE_URL || !env.CURSOR_SECRET || env.CURSOR_SECRET.length < 32) {
    throw new Error('DATABASE_URL and CURSOR_SECRET (at least 32 characters) are required');
  }
  const url = new URL(env.DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Invalid database protocol');
  const port = Number(env.PORT ?? 3100);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  if (env.AUTH_SECRET && env.AUTH_SECRET.length < 32) throw new Error('AUTH_SECRET must have at least 32 characters');
  return { databaseUrl: env.DATABASE_URL, cursorSecret: env.CURSOR_SECRET, authSecret: env.AUTH_SECRET || undefined, port, host: env.HOST ?? '127.0.0.1', geoapifyKey: env.GEOAPIFY_API_KEY?.trim() || undefined, corsOrigin: env.CORS_ORIGIN };
}
