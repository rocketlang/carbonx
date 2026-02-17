import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, dkLen: 64 };

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, SCRYPT_PARAMS.dkLen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
  }).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  try {
    const hashBuffer = Buffer.from(hash, 'hex');
    const derived = scryptSync(password, salt, SCRYPT_PARAMS.dkLen, {
      N: SCRYPT_PARAMS.N,
      r: SCRYPT_PARAMS.r,
      p: SCRYPT_PARAMS.p,
    });
    return timingSafeEqual(hashBuffer, derived);
  } catch {
    return false;
  }
}
