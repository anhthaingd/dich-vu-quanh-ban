import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { ServiceUnavailableException } from '@nestjs/common';

// OWASP scrypt profile: 128 MiB, r=8, p=1. Bound concurrent work before
// entering libuv so a local login burst cannot exhaust host memory.
let active = 0;
async function derive(password: string, salt: string): Promise<Buffer> {
  if (active >= 2) throw new ServiceUnavailableException();
  active++;
  try {
    return await new Promise((resolve, reject) => scrypt(password, salt, 64,
      { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)));
  } finally { active--; }
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt-v1$${salt}$${(await derive(password.normalize('NFC'), salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string | null) {
  const parts = stored?.match(/^scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/);
  // Same expensive operation for unknown accounts; no early success/failure
  // based on whether an identity exists.
  const actual = await derive(password.normalize('NFC'), parts?.[1] ?? '0'.repeat(32));
  return timingSafeEqual(actual, Buffer.from(parts?.[2] ?? '0'.repeat(128), 'hex')) && !!parts;
}
