import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { CacheModule, RedisModule } from '@/infra';

import { DatabaseModule } from '@/database/database.module';

import { ApiKeyModule } from '@/api-key/api-key.module';

import { ApiKeyUsageCron } from '@/scheduler/api-key-last-used.cron';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// ----------------------------------------------------------------------

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    CacheModule,
    RedisModule,
    ApiKeyModule,
  ],
  controllers: [AppController],
  providers: [AppService, ApiKeyUsageCron],
})
export class AppModule {}
