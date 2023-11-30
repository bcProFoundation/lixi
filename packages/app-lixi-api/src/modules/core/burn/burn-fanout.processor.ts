import * as _ from 'lodash';
import { VError } from 'verror';
import moment from 'moment';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Redis } from 'ioredis';
import { I18n, I18nService } from 'nestjs-i18n';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { BURN_FANOUT_QUEUE } from './burn.constants';
import { Burn, Post, PostType } from '@bcpros/lixi-prisma';
import { FollowCacheService } from '../../account/follow-cache.service';
import { PostCacheService } from '../../page/post-cache.service';
import { template } from 'src/utils/stringTemplate';

@Injectable()
@Processor(BURN_FANOUT_QUEUE, { concurrency: 50 })
export class BurnFanoutProcessor extends WorkerHost {
  private logger: Logger = new Logger(this.constructor.name);

  static inNetworkSourceKey = 'timeline:innetwork:source';
  static outNetworkSourceKey = 'timeline:outnetwork:source';
  static pageTimelineKey = 'timeline:page:{{pageId}}';
  static pageTimelineByTimeNoAccountKey = 'timeline:page:{{pageId}}:account:none';
  static pageTimelineByTimeWithAccountKey = 'timeline:page:{{pageId}}:account:{{accountId}}';
  static pageTimelineByTimeWithLevelKey = 'timeline:page:{{pageId}}:{{level}}';
  static pageTimelineByTimeNoLevelShowNegativeKey = 'timeline:page:{{pageId}}:showNegative:true';
  static timelineTokenKey = 'timeline:token';
  static timelineProfileKey = 'timeline:profile';

  constructor(
    private readonly followCacheService: FollowCacheService,
    private readonly postCacheService: PostCacheService,
    @InjectRedis() private readonly redis: Redis
  ) {
    super();
  }

  public async process(
    job: Job<{ burn: Burn; post: Post; previousDanaBurnScore: number; latestDanaBurnScore: number }, boolean, string>
  ): Promise<boolean> {
    try {
      // This is only for post
      // @todo: Need to more organize for multiple types
      const { burn, post, latestDanaBurnScore, previousDanaBurnScore } = job.data;
      const id = post.id;

      // Invalidate the cache
      const epoch = '2023-01-01 00:00:00';
      const diffHour = moment.duration(moment(burn.createdAt).diff(moment(epoch))).asHours();
      const score = burn.burnType
        ? burn.burnedValue * Math.pow(2, diffHour / 12)
        : -burn.burnedValue * Math.pow(2, diffHour / 12);

      const accountId = post.accountId;
      const pageAccountId = post?.pageId;

      // Find all the followers
      const [accountFollowers, pageFollowers] = await Promise.all([
        this.followCacheService.getAccountFollowers(accountId),
        pageAccountId ? this.followCacheService.getPageFollowers(pageAccountId) : Promise.resolve([])
      ]);

      const followers = _.uniq(_.compact(_.concat(accountFollowers, pageFollowers)));

      const pipeline = this.redis.pipeline();

      // Clear the post from cache
      await this.postCacheService.removeByKeys([id]);

      // Update score for outnetwork
      const keyOutnetwork = BurnFanoutProcessor.outNetworkSourceKey;
      const timelineId = `${PostType.POST}:${id}`;
      pipeline.zincrby(keyOutnetwork, score, timelineId);

      // Update score for innetwork
      for (const follower of followers) {
        const keyInNetwork = `${BurnFanoutProcessor.inNetworkSourceKey}:${follower}`;
        pipeline.zincrby(keyInNetwork, score, timelineId);
      }

      //update score for post in page or token
      if (post.pageId) {
        const level = [1, 10, 100, 1000];
        const keyPage = template(`${BurnFanoutProcessor.pageTimelineKey}`, { pageId: post.pageId });
        pipeline.zincrby(keyPage, score, timelineId);

        const postCreatedAt = new Date(post.createdAt).getTime();

        // move timelineId from level to level based on latestDanaBurnScore and previousDanaBurnScore
        for (let i = 0; i < level.length; i++) {
          const keyPageByTimeWithLevel = template(`${BurnFanoutProcessor.pageTimelineByTimeWithLevelKey}`, {
            pageId: post.pageId,
            level: level[i]
          });

          pipeline.zrem(keyPageByTimeWithLevel, timelineId);

          if (latestDanaBurnScore >= level[i] && latestDanaBurnScore < level[i + 1]) {
            pipeline.zadd(keyPageByTimeWithLevel, postCreatedAt, timelineId);
          }
        }

        //If latestDanaBurnScore is negative, add postId to pageTimelineByTimeNoLevelShowNegativeKey, and remove postId from pageTimelineByTimeWithAccountKey
        if (latestDanaBurnScore < 0) {
          pipeline.zadd(
            template(`${BurnFanoutProcessor.pageTimelineByTimeNoLevelShowNegativeKey}`, { pageId: post.pageId }),
            postCreatedAt,
            timelineId
          );
          pipeline.zrem(
            template(`${BurnFanoutProcessor.pageTimelineByTimeWithAccountKey}`, {
              pageId: post.pageId,
              accountId: post.accountId
            }),
            timelineId
          );
        }
      } else if (post.tokenId) {
        const keyToken = `${BurnFanoutProcessor.timelineTokenKey}:${post.tokenId}`;
        pipeline.zincrby(keyToken, score, timelineId);
      }

      //update score for post in profile
      const keyProfile = `${BurnFanoutProcessor.timelineProfileKey}:${post.accountId}`;
      pipeline.zincrby(keyProfile, score, timelineId);

      await pipeline.exec();
    } catch (error) {
      this.logger.error(error);
      return false;
    }
    return true;
  }
}
