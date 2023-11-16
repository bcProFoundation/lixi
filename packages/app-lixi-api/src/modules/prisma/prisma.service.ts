import { PrismaClient } from '@bcpros/lixi-prisma';
import { INestApplication, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as _ from 'lodash';
import prismaCacheMiddleware from 'prisma-cache-middleware';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private logger: Logger, private readonly config: ConfigService) {
    super();
    // super({
    //   log: [
    //     { emit: 'event', level: 'query' },
    //     { emit: 'stdout', level: 'info' },
    //     { emit: 'stdout', level: 'warn' },
    //     { emit: 'stdout', level: 'error' },
    //   ],
    //   errorFormat: 'colorless',
    // });
    const cacheMiddleWare = prismaCacheMiddleware({
      redisOptions: {
        host: config.get<string>('REDIS_HOST') ? config.get<string>('REDIS_HOST') : 'redis-lixi',
        port: config.get<string>('REDIS_PORT') ? _.toSafeInteger(config.get<string>('REDIS_PORT')) : 6379
      },
      instances: [
        {
          model: 'NotificationType',
          action: 'findFirst',
          ttl: 300
        }
      ]
    });
    this.$use(cacheMiddleWare);

    // @ts-ignore
    // this.$on('query', async (e) => {
    // @ts-ignore
    // console.log(e.query, e.params);
    // });
  }

  async onModuleInit() {
    // this.logger.log('Query: ' + e.query)
    // this.logger.log('Params: ' + e.params)
    // this.logger.log('Duration: ' + e.duration + 'ms')
    // });

    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    // this.$on('beforeExit', async () => {
    //   await app.close();
    // });
  }
}
