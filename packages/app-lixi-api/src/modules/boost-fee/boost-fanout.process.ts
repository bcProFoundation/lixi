import { Post, BoostFee } from '@bcpros/lixi-prisma';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Redis } from 'ioredis';
import * as _ from 'lodash';
import moment from 'moment';
import { I18n, I18nService } from 'nestjs-i18n';
import { epoch } from 'src/utils/constants';
import { BOOST_FANOUT_QUEUE } from './boost.constants';

@Injectable()
@Processor(BOOST_FANOUT_QUEUE, { concurrency: 50 })
export class BoostFanoutProcessor extends WorkerHost {
  private logger: Logger = new Logger(this.constructor.name);

  //timeline for offer
  static offerTimeline = 'timeline:offer:showAll';

  constructor(
    @InjectRedis() private readonly redis: Redis,
    @I18n() private readonly i18n: I18nService
  ) {
    super();
  }

  public async process(job: Job<{ boost: BoostFee; post: Post }, boolean, string>): Promise<boolean> {
    try {
      const { post, boost } = job.data;
      if (!post) return true;
      const id = `${post.id}`;

      // Invalidate the cache
      const diffHour = moment.duration(moment(boost.createdAt).diff(moment(epoch))).asHours();
      const score = boost.boostType
        ? boost.boostedValue * Math.pow(2, diffHour / 12)
        : -boost.boostedValue * Math.pow(2, diffHour / 12);

      const timelineId = `${post.type}:${id}`;

      const pipeline = this.redis.pipeline();
      //update score of post
      pipeline.zincrby(BoostFanoutProcessor.offerTimeline, score, timelineId);

      await pipeline.exec();
    } catch (error) {
      this.logger.error(error);
      return false;
    }
    return true;
  }
}
