import { InjectRedis } from '@songkeys/nestjs-redis';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { template } from 'src/utils/stringTemplate';
import { CronJob } from 'cron';
import { SchedulerRegistry } from '@nestjs/schedule';

export class LocalEcashCacheService implements OnModuleInit {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:chronik-watcher:telegram-notification';

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly schedulerRegistry: SchedulerRegistry
  ) {}

  onModuleInit() {
    // run every 2 minutes
    const job = new CronJob(`0 */2 * * * *`, async () => {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      await this.redis.zremrangebyscore(this.keyPrefix, 0, sixHoursAgo.getTime());
    });
    this.schedulerRegistry.addCronJob(`remove-telegram-notification-cache`, job);
    this.logger.log(`CRONJOB: remove telegram notification cache`);
    job.start();
  }

  async cacheTelegramNotification(telegramId: string, txid: string) {
    await this.redis.zincrby(this.keyPrefix, new Date().getTime(), `${telegramId}:${txid}`);
  }

  async getTelegramNotificationCacheItem(telegramId: string, txid: string) {
    const key = template(`${this.keyPrefix}`, { telegramId });

    const timestamp = await this.redis.zscore(this.keyPrefix, `${telegramId}:${txid}`);
    return timestamp; // Returns the timestamp (score) or null if the txid doesn't exist
  }
}
