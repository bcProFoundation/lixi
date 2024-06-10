import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { CronJob } from 'cron';
import { Redis } from 'ioredis';
import { GHPerDana, adjustRate } from '@bcpros/lixi-models';

@Injectable()
export class DanaAdjustService implements OnModuleInit {
  private logger: Logger = new Logger(DanaAdjustService.name);
  private keyAdjustDana = 'items:danaRate-adjust';

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly schedulerRegistry: SchedulerRegistry
  ) {}

  async onModuleInit() {
    //run everyday at midnight
    const job = new CronJob('0 0 0 * * *', async () => {
      const date = new Date();
      const today = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;

      const danaRateYesterday = await this.redis.hget(this.keyAdjustDana, yesterdayKey);
      if (!danaRateYesterday) {
        this.redis.hset(this.keyAdjustDana, today, GHPerDana);
      } else {
        this.redis.hset(this.keyAdjustDana, today, Number(danaRateYesterday) / adjustRate);
      }
    });

    this.schedulerRegistry.addCronJob('adjust-dana', job);
    job.start();
  }
}
