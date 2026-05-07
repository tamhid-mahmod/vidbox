import crypto from 'crypto';

// ----------------------------------------------------------------------

const REDIS_KEY_SECRET = process.env.REDIS_KEY_SECRET || '';

// ----------------------------------------------------------------------

export function extractKeyId(plainKey: string): string | null {
  if (!plainKey || !plainKey.startsWith('VBX_')) return null;

  const parts = plainKey.split('_');

  if (parts.length < 3) return null;

  const keyId = parts[1];

  if (!/^[a-f0-9]{32}$/i.test(keyId)) return null;

  return keyId;
}

// ----------------------------------------------------------------------

export function digest(plain: string) {
  return crypto
    .createHmac('sha256', REDIS_KEY_SECRET)
    .update(plain)
    .digest('hex');
}
