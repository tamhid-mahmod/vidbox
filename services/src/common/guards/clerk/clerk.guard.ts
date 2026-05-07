import Redis from 'ioredis';
import * as argon2 from 'argon2';
import { LRUCache } from 'lru-cache';
import { verifyToken } from '@clerk/backend';
import { and, eq, isNull } from 'drizzle-orm';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import {
  CachedKey,
  LAST_USED_DEBOUNCE_SEC,
  LAST_USED_HASH,
  LRU_SOFT_TTL_MS,
  REDIS_HARD_TTL,
  VERSION,
} from '@/configs';

import { REDIS_CLIENT } from '@/infra';

import { digest, extractKeyId } from '@/utils/apiKey';

import { DRIZZLE_DB } from '@/database/database.module';
import type { DrizzleDBType } from '@/database/type';

// ----------------------------------------------------------------------

const localCache = new LRUCache<string, CachedKey>({
  max: 100_000,
});

// ----------------------------------------------------------------------

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    @Inject(DRIZZLE_DB) private db: DrizzleDBType,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private async trackApiKeyLastUsed(keyId: string) {
    const lockKey = `vbx:api_key:last_used_lock:${VERSION}:${keyId}`;

    const ok = await this.redis.set(
      lockKey,
      '1',
      'EX',
      LAST_USED_DEBOUNCE_SEC,
      'NX',
    );
    if (!ok) return;

    await this.redis.hset(LAST_USED_HASH, keyId, Date.now().toString());
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (apiKey) {
      const keyId = extractKeyId(apiKey);

      if (!keyId) {
        throw new UnauthorizedException('Invalid API key');
      }

      const d = digest(apiKey);
      const lruKey = `${VERSION}:${keyId}`;
      const now = Date.now();

      try {
        const c = localCache.get(lruKey);
        if (c && c.expiresAt > now && c.apiKeyDigest === d) {
          request.user = {
            id: c.userId,
            keyId,
          };

          void this.trackApiKeyLastUsed(keyId);

          return true;
        }

        const rKeyDigest = `vbx:api_key:${VERSION}:${keyId}`;
        const rDigest = await this.redis.hgetall(rKeyDigest);

        if (rDigest?.invalid === '1' || rDigest?.apiKeyDigest !== d) {
          throw new UnauthorizedException('Unauthorized!');
        }

        if (rDigest?.user_id) {
          localCache.set(lruKey, {
            userId: rDigest.user_id,
            apiKeyDigest: d,
            expiresAt: now + LRU_SOFT_TTL_MS,
          });

          request.user = {
            id: rDigest.user_id,
            keyId,
          };

          void this.trackApiKeyLastUsed(keyId);

          return true;
        }

        const record = await this.db.query.api_key.findFirst({
          where: (ak) => and(eq(ak.id, keyId), isNull(ak.revoked_at)),
          columns: {
            value: true,
            user_id: true,
            revoked_at: true,
          },
        });

        if (!record) {
          throw new UnauthorizedException('Unauthorized!');
        }

        const isValid = await argon2.verify(record.value, apiKey);

        if (!isValid) {
          await this.redis.hset(rKeyDigest, {
            invalid: '1',
          });

          await this.redis.expire(rKeyDigest, REDIS_HARD_TTL);

          throw new UnauthorizedException('Unauthorized!');
        }

        await this.redis.hset(rKeyDigest, {
          user_id: record.user_id,
          apiKeyDigest: d,
        });
        await this.redis.expire(rKeyDigest, REDIS_HARD_TTL);

        request.user = {
          id: record.user_id,
          keyId,
        };

        void this.trackApiKeyLastUsed(keyId);

        return true;
      } catch (error) {
        console.error('Authorization error:', error);
        throw new UnauthorizedException('Unauthorized!');
      }
    }

    const token = request.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const verfiedToken = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });

      request.user = {
        id: verfiedToken.sub,
        ...verfiedToken,
      };

      return true;
    } catch (error) {
      console.error('Authorization error:', error);
      throw new UnauthorizedException(
        'Something went wrong! please upload your file by using our SDK',
      );
    }
  }
}
