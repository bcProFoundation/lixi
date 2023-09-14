import { AnalyticEvent } from '@bcpros/lixi-models';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { EVENTS_ANALYTIC_QUEUE } from './events-analytic.constants';
import ReBloom from '../../common/redis/redis-bloom';

@Injectable()
@Processor(EVENTS_ANALYTIC_QUEUE, { concurrency: 5 })
export class EventsAnalyticProcessor extends WorkerHost {
  private logger: Logger = new Logger(this.constructor.name);
  private reBloom: ReBloom;

  constructor(@InjectRedis() private readonly redis: Redis, private prisma: PrismaService) {
    super();
    this.reBloom = new ReBloom(this.redis);
  }

  public async process(
    job: Job<
      { events: AnalyticEvent[], accountId: number },
      boolean,
      string
    >
  ) {
    try {
      const { events } = job.data;
      const groups = _.groupBy(events, 'eventType');
      const groupKeys = Object.keys(groups);
      for (const groupKey of groupKeys) {
        const eventsArr = groups[groupKey];
        if (!eventsArr || eventsArr.length == 0) {
          continue;
        }

        // Process the events

      }



    } catch (error) {
      this.logger.error(error);
      return false;
    }
    return true;
  }

  private async processImpressionEvents(events: AnalyticEvent[], accountId: number) {
    const accountPostImpressionBfKey = `post-impression-exist-bf:${accountId}`;
    const accountPostImpressionBfExist = await this.redis.exists(accountPostImpressionBfKey);
    if (!accountPostImpressionBfExist) {
      await this.reBloom.reserve(accountPostImpressionBfKey, 0.001, 1000);
    }
    const reBloomPromises = [];
    for (const event of events) {
      const postId = event.eventData.id;
      reBloomPromises.push(this.reBloom.add(accountPostImpressionBfKey, postId));
    }
    await Promise.allSettled(reBloomPromises);
  }

  private async processViewEvents(events: AnalyticEvent[], accountId: number) {
    const accountPostViewBfKey = `post-view-exist-bf:${accountId}`;
    const accountPostViewBfExist = await this.redis.exists(accountPostViewBfKey);
    if (!accountPostViewBfExist) {
      await this.reBloom.reserve(accountPostViewBfKey, 0.001, 1000);
    }
    const reBloomPromises = [];
    for (const event of events) {
      const postId = event.eventData.id;
      reBloomPromises.push(this.reBloom.add(accountPostViewBfKey, postId));
    }
    await Promise.allSettled(reBloomPromises);
  }

}
