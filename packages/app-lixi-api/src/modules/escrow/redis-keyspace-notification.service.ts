import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Redis } from 'ioredis';
import { REDIS_CLIENTS_KEYSPACE_NOTIFICATION } from 'src/common/redis/redis.constants';
@Injectable()
export class RedisKeySpaceNotification implements OnModuleInit {
  private logger: Logger = new Logger(RedisKeySpaceNotification.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectRedis(REDIS_CLIENTS_KEYSPACE_NOTIFICATION) private readonly redisKeySpace: Redis
  ) {}

  async onModuleInit() {
    // enable keypace notification with expire event
    try {
      this.redis.config('SET', 'notify-keyspace-events', 'Ex');
    } catch (err) {
      console.log('err redis: ', err);
    }

    this.redisKeySpace.psubscribe('__keyevent@0__:expired', (err, count) => {
      if (err) {
        this.logger.error('Failed to subscribe:', err);
      } else {
        this.logger.log('Subscribe successful');
      }
    });

    this.redisKeySpace.on('pmessage', (pattern, channel, message) => {
      //key timeline: lixilotus:timeline:offer:keyFilter expire will delete assicated index - keyIndex: lixilotus:docOffer:keyFilter
      if (message.includes('lixilotus:timeline:offer')) {
        const arrKey = message.split('timeline:offer:');
        const keyFilter = arrKey[arrKey.length - 1];
        this.redis.del(`docOffer:${keyFilter}`);
      }
    });

    this.logger.log(`The service redis-keySpace-notification has been initialized.`);
  }
}
