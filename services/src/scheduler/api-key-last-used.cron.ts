import Redis from 'ioredis';
import { Cron } from '@nestjs/schedule';
import { Inject, Injectable } from '@nestjs/common';

import { REDIS_CLIENT } from '@/infra';

import { DRIZZLE_DB } from '@/database/database.module';
import type { DrizzleDBType } from '@/database/type';
import { LAST_USED_HASH } from '@/configs';
import { sql } from 'drizzle-orm';

// ----------------------------------------------------------------------

@Injectable()
export class ApiKeyUsageCron {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: DrizzleDBType,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Cron('*/5 * * * *')
  async flushLastUsed() {
    const tempKey = `${LAST_USED_HASH}:flushing:${Date.now()}`;

    try {
      await this.redis.rename(LAST_USED_HASH, tempKey);
    } catch (err: any) {
      if (err.message?.includes('no such key')) {
        return;
      }
      throw err;
    }

    const map = await this.redis.hgetall(tempKey);
    if (!map || Object.keys(map).length === 0) {
      await this.redis.del(tempKey);
      return;
    }

    const entries = Object.entries(map)
      .map(([keyId, ts]) => ({
        keyId,
        ts: new Date(Number(ts)),
      }))
      .filter(
        (x) => x.keyId && x.ts instanceof Date && !Number.isNaN(x.ts.getTime()),
      );

    if (entries.length === 0) {
      await this.redis.del(tempKey);
      return;
    }

    const valuesSql = sql.join(
      entries.map((e) => sql`(${e.keyId}::uuid, ${e.ts}::timestamptz)`),
      sql`,`,
    );

    await this.db.execute(sql`
        UPDATE api_key AS ak
        SET last_used_at = v.ts
        FROM (VALUES ${valuesSql}) AS v(id,ts)
        WHERE ak.id = v.id    
    `);

    await this.redis.del(tempKey);
  }
}
