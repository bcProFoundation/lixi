import { InjectRedis } from '@songkeys/nestjs-redis';
import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { template } from 'src/utils/stringTemplate';

export class ChronikWatcherCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:chronik-watcher:telegram-notification:{{telegramId}}';

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async cacheTelegramNotification(telegramId: string, txid: string) {
    const key = template(`${this.keyPrefix}`, { telegramId });
    await this.redis.zincrby(key, new Date().getTime(), txid);
  }

  async getTelegramNotificationCacheItem(telegramId: string, txid: string) {
    const key = template(`${this.keyPrefix}`, { telegramId });

    const timestamp = await this.redis.zscore(key, txid);
    return timestamp; // Returns the timestamp (score) or null if the txid doesn't exist
  }
}
