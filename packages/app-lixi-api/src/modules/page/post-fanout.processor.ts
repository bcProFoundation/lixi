import * as _ from 'lodash';
import { VError } from 'verror';
import moment from 'moment';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Redis } from 'ioredis';
import { I18n, I18nService } from 'nestjs-i18n';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { CONTENT_FANOUT_QUEUE } from './constants';
import { Burn, Post } from '@bcpros/lixi-prisma';
import { FollowCacheService } from '../account/follow-cache.service';
import ReBloom from '../../common/redis/redis-bloom';
import { PostCacheService } from './post-cache.service';

@Injectable()
@Processor(CONTENT_FANOUT_QUEUE, { concurrency: 50 })
export class PostFanoutProcessor extends WorkerHost {
  private logger: Logger = new Logger(this.constructor.name);

  static inNetworkSourceKey = 'timeline:innetwork:source';

  constructor(
    private readonly postCacheService: PostCacheService,
    private readonly followCacheService: FollowCacheService,
    @InjectRedis() private readonly redis: Redis,
    @I18n() private readonly i18n: I18nService
  ) {
    super();
  }

  public async process(job: Job<{ post: Post }, boolean, string>): Promise<boolean> {
    try {
      const { post } = job.data;
      if (!post) return true;
      const id = `${post.id}`;

      // Invalidate the cache
      const epoch = '2023-01-01 00:00:00';
      const diffHour = moment.duration(moment(post.createdAt).diff(moment(epoch))).asHours();
      const score = 1 * Math.pow(2, diffHour / 12);

      const postAccountId = post.postAccountId;
      const pageAccountId = post?.pageId;

      // Find all the followers
      const [accountFollowers, pageFollowers] = await Promise.all([
        this.followCacheService.getAccountFollowers(postAccountId),
        pageAccountId ? this.followCacheService.getPageFollowers(pageAccountId) : Promise.resolve([])
      ]);

      const followers = _.uniq(_.compact(_.concat(postAccountId, accountFollowers, pageFollowers)));

      // Check if user view has view the post or not
      const postviewBfKey = `post-view-exist-bf:${postAccountId}`;

      const postviewBfExist = await this.redis.exists(postviewBfKey);

      const reBloom = new ReBloom(this.redis);
      if (!postviewBfExist) {
        await reBloom.reserve(postviewBfKey, 0.001, 1000);
      }

      // Update dana view score and view for the post user
      await reBloom.add(postviewBfKey, id);

      // Clear the post from cache
      await this.postCacheService.removeByKeys([id]);

      const pipeline = this.redis.pipeline();
      // Update score for innetwork
      const timelineId = `post:${id}`;
      for (const follower of followers) {
        const keyInNetwork = `${PostFanoutProcessor.inNetworkSourceKey}:${follower}`;
        pipeline.zincrby(keyInNetwork, score, timelineId);
      }

      await pipeline.exec();
    } catch (error) {
      this.logger.error(error);
      return false;
    }
    return true;
  }
}
