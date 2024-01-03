import { PostType } from '@bcpros/lixi-prisma';
import { Post } from '@bcpros/lixi-prisma';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Redis } from 'ioredis';
import * as _ from 'lodash';
import moment from 'moment';
import { I18n, I18nService } from 'nestjs-i18n';
import { template } from 'src/utils/stringTemplate';
import ReBloom from '../../common/redis/redis-bloom';
import { FollowCacheService } from '../account/follow-cache.service';
import { CONTENT_FANOUT_QUEUE } from './constants';
import { PostCacheService } from './post-cache.service';

@Injectable()
@Processor(CONTENT_FANOUT_QUEUE, { concurrency: 50 })
export class PostFanoutProcessor extends WorkerHost {
  private logger: Logger = new Logger(this.constructor.name);

  static inNetworkSourceKey = 'timeline:innetwork:source';
  static outNetworkSourceKey = 'timeline:outnetwork:source';

  //page key
  static pageTimelineKey = 'timeline:page:{{pageId}}';
  static pageTimelineByTimeWithDanaFilterKey = 'timeline:page:{{pageId}}:{{level}}';
  static pageTimelineByTimeShowAll = 'timeline:page:{{pageId}}:showAll';

  //profile key
  static profileTimelineKey = 'timeline:profile:{{accountId}}';
  static profileTimelineByTimeWithDanaFilterKey = 'timeline:profile:{{accountId}}:{{level}}';
  static profileTimelineByTimeShowAll = 'timeline:profile:{{accountId}}:showAll';

  //token key
  static tokenTimelineKey = 'timeline:token:{{tokenId}}';
  static tokenTimelineByTimeWithDanaFilterKey = 'timeline:token:{{tokenId}}:{{level}}';
  static tokenTimelineByTimeShowAll = 'timeline:token:{{tokenId}}:showAll';

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

      const accountId = post.accountId;
      const pageAccountId = post?.pageId;

      // Find all the followers
      const [accountFollowers, pageFollowers] = await Promise.all([
        this.followCacheService.getAccountFollowers(accountId),
        pageAccountId ? this.followCacheService.getPageFollowers(pageAccountId) : Promise.resolve([])
      ]);

      const followers = _.uniq(_.compact(_.concat(accountId, accountFollowers, pageFollowers)));

      // Check if user view has view the post or not
      const postviewBfKey = `post-view-exist-bf:${accountId}`;

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
      const timelineId = `${PostType.POST}:${id}`;
      for (const follower of followers) {
        const keyInNetwork = `${PostFanoutProcessor.inNetworkSourceKey}:${follower}`;
        pipeline.zincrby(keyInNetwork, score, timelineId);
      }

      //add default score when create post in page, token, profile
      if (post.pageId) {
        const keyPage = template(`${PostFanoutProcessor.pageTimelineKey}`, { pageId: post.pageId });
        const keyPageTimelineByTimeWithDanaFilter = template(
          `${PostFanoutProcessor.pageTimelineByTimeWithDanaFilterKey}`,
          {
            pageId: post.pageId,
            level: 0
          }
        );
        const keyPageTimelineByTimeShowAll = template(`${PostFanoutProcessor.pageTimelineByTimeShowAll}`, {
          pageId: post.pageId
        });
        const postCreatedAt = new Date(post.createdAt).getTime();

        pipeline.zincrby(keyPage, score, timelineId);
        pipeline.zadd(keyPageTimelineByTimeWithDanaFilter, postCreatedAt, timelineId);
        pipeline.zadd(keyPageTimelineByTimeShowAll, postCreatedAt, timelineId);
      } else if (post.tokenId) {
        const keyToken = template(`${PostFanoutProcessor.tokenTimelineKey}`, { tokenId: post.tokenId });
        const keyTokenTimelineByTimeWithDanaFilter = template(
          `${PostFanoutProcessor.tokenTimelineByTimeWithDanaFilterKey}`,
          {
            tokenId: post.tokenId,
            level: 0
          }
        );
        const keyTokenTimelineByTimeShowAll = template(`${PostFanoutProcessor.tokenTimelineByTimeShowAll}`, {
          tokenId: post.tokenId
        });
        const postCreatedAt = new Date(post.createdAt).getTime();

        pipeline.zincrby(keyToken, score, timelineId);
        pipeline.zadd(keyTokenTimelineByTimeWithDanaFilter, postCreatedAt, timelineId);
        pipeline.zadd(keyTokenTimelineByTimeShowAll, postCreatedAt, timelineId);
      }

      const keyProfile = template(`${PostFanoutProcessor.profileTimelineKey}`, { accountId: post.accountId });
      const keyProfileTimelineByTimeWithDanaFilter = template(
        `${PostFanoutProcessor.profileTimelineByTimeWithDanaFilterKey}`,
        {
          accountId: post.accountId,
          level: 0
        }
      );
      const keyProfileTimelineByTimeShowAll = template(`${PostFanoutProcessor.profileTimelineByTimeShowAll}`, {
        acocuntId: post.accountId
      });
      const postCreatedAt = new Date(post.createdAt).getTime();

      pipeline.zincrby(keyProfile, score, timelineId);
      pipeline.zadd(keyProfileTimelineByTimeWithDanaFilter, postCreatedAt, timelineId);
      pipeline.zadd(keyProfileTimelineByTimeShowAll, postCreatedAt, timelineId);

      await pipeline.exec();
    } catch (error) {
      this.logger.error(error);
      return false;
    }
    return true;
  }
}
