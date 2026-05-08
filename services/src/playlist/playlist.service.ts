import { and, count, eq, max } from 'drizzle-orm';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DEFAULT_PLAYLIST_LIMIT } from '@/configs';

import { DRIZZLE_DB } from '@/database/database.module';
import { playlist } from '@/database/schema';
import type { DrizzleDBType } from '@/database/type';

import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';

// ----------------------------------------------------------------------

@Injectable()
export class PlaylistService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDBType) {}

  async create(userId: string, dto: CreatePlaylistDto) {
    const [result] = await this.db
      .select({
        count: count(),
        limit: max(playlist.limit),
      })
      .from(playlist)
      .where(eq(playlist.user_id, userId));

    const effectiveLimit = result?.limit ?? DEFAULT_PLAYLIST_LIMIT;

    if (result.count >= effectiveLimit) {
      throw new BadRequestException(
        'Maximum playlist limit reached. Contact support for adding more playlists.',
      );
    }

    const [created] = await this.db
      .insert(playlist)
      .values({
        user_id: userId,
        name: dto.name,
        description: dto.description,
        created_at: new Date(),
      })
      .returning();

    return created;
  }

  async findAll(userId: string) {
    return this.db.select().from(playlist).where(eq(playlist.user_id, userId));
  }

  async findOne(userId: string, id: string) {
    const record = await this.db.query.playlist.findFirst({
      where: (p) => and(eq(p.id, id), eq(p.user_id, userId)),
    });

    if (!record) {
      throw new NotFoundException('Playlist not found');
    }

    return record;
  }

  async update(userId: string, id: string, dto: UpdatePlaylistDto) {
    const [updated] = await this.db
      .update(playlist)
      .set(dto)
      .where(and(eq(playlist.id, id), eq(playlist.user_id, userId)))
      .returning();

    if (!updated) {
      throw new NotFoundException('Playlist not found');
    }

    return updated;
  }

  async remove(userId: string, id: string) {
    const [deleted] = await this.db
      .delete(playlist)
      .where(and(eq(playlist.id, id), eq(playlist.user_id, userId)))
      .returning();

    if (!deleted) {
      throw new NotFoundException('Playlist not found');
    }

    return deleted;
  }
}
