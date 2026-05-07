// ----------------------------------------------------------------------

export const VERSION = 'v1';
export const REDIS_HARD_TTL = 10 * 60;
export const LRU_SOFT_TTL_MS = 5 * 60 * 1000;
export const LAST_USED_DEBOUNCE_SEC = 60;
export const LAST_USED_HASH = `vbx:api_key:last_used:${VERSION}`;

export interface CachedKey {
  userId: string;
  apiKeyDigest: string;
  expiresAt: number;
}
