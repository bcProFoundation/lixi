import * as _ from 'lodash';
import moment from 'moment';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Redis } from 'ioredis';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { BURN_FANOUT_QUEUE } from './burn.constants';
import { Burn, Post } from '@bcpros/lixi-prisma';
import { FollowCacheService } from '../../account/follow-cache.service';
import { PostCacheService } from '../../page/post-cache.service';
import { template } from 'src/utils/stringTemplate';
import { BurnForType, POST_FLAG } from '@bcpros/lixi-models';
import { epoch } from 'src/utils/constants';

@Injectable()
@Processor(BURN_FANOUT_QUEUE, { concurrency: 50 })
export class BurnFanoutProcessor extends WorkerHost {
  private logger: Logger = new Logger(this.constructor.name);

  static inNetworkSourceKey = 'timeline:innetwork:source';
  static outNetworkSourceKey = 'timeline:outnetwork:source';

  //page key
  static pageTimelineKey = 'timeline:page:{{pageId}}';
  static pageTimelineByTimeWithDanaFilterKey = 'timeline:page:{{pageId}}:{{level}}';
  static pageTimelineByTimeShowAll = 'timeline:page:{{pageId}}:showAll';
  static feedPageTimeline = 'timeline:pages';

  //profile key
  static profileTimelineKey = 'timeline:profile:{{accountId}}';
  static profileTimelineByTimeWithDanaFilterKey = 'timeline:profile:{{accountId}}:{{level}}';
  static profileTimelineByTimeShowAll = 'timeline:profile:{{accountId}}:showAll';

  //token key
  static tokenTimelineKey = 'timeline:token:{{tokenId}}';
  static tokenTimelineByTimeWithDanaFilterKey = 'timeline:token:{{tokenId}}:{{level}}';
  static tokenTimelineByTimeShowAll = 'timeline:token:{{tokenId}}:showAll';
  static feedTokenTimeline = 'timeline:tokens';

  //burn key
  static burnTimelineKey = 'timeline:burn:{{postId}}';

  //post-bitmap
  static bitMapPostKey = 'bitmap:post:{{postId}}';

  constructor(
    private readonly followCacheService: FollowCacheService,
    private readonly postCacheService: PostCacheService,
    @InjectRedis() private readonly redis: Redis
  ) {
    super();
  }

  public async process(
    job: Job<
      {
        burn: Burn;
        post: Post;
        burnAccountId: number;
        latestDanaBurnScore: number;
        amountDana: number;
        burnForType: BurnForType;
        burnForId: string;
      },
      boolean,
      string
    >
  ): Promise<boolean> {
    try {
      const { burn, post, latestDanaBurnScore, burnAccountId, amountDana, burnForType, burnForId } = job.data;

      const pipeline = this.redis.pipeline();

      const diffHour = moment.duration(moment(burn.createdAt).diff(moment(epoch))).asHours();
      const score = burn.burnType ? amountDana * Math.pow(2, diffHour / 12) : -amountDana * Math.pow(2, diffHour / 12);

      switch (burnForType) {
        case BurnForType.Post:
          const id = post.id;
          // Invalidate the cache
          const accountId = post.accountId;
          const pageAccountId = post?.pageId;

          // Find all the followers
          const [accountFollowers, pageFollowers] = await Promise.all([
            this.followCacheService.getAccountFollowers(accountId),
            pageAccountId ? this.followCacheService.getPageFollowers(pageAccountId) : Promise.resolve([])
          ]);

          const followers = _.uniq(_.compact(_.concat(accountFollowers, pageFollowers)));

          // Clear the post from cache
          await this.postCacheService.removeByKeys([id]);

          //set bitMap of post
          if (Number(burnAccountId) !== post.accountId) {
            pipeline.setbit(
              template(BurnFanoutProcessor.bitMapPostKey, { postId: post.id }),
              POST_FLAG.BURNED_BY_OTHERS,
              1
            );
          }

          //update burnTimeline
          const burnKey = template(`${BurnFanoutProcessor.burnTimelineKey}`, { postId: id });
          pipeline.zadd(burnKey, new Date(burn?.createdAt ?? 0).getTime(), burn.id);

          // Update score for outnetwork
          const keyOutnetwork = BurnFanoutProcessor.outNetworkSourceKey;
          const timelineId = `${post.type}:${id}`;
          pipeline.zincrby(keyOutnetwork, score, timelineId);

          // Update score for innetwork
          for (const follower of followers) {
            const keyInNetwork = `${BurnFanoutProcessor.inNetworkSourceKey}:${follower}`;
            pipeline.zincrby(keyInNetwork, score, timelineId);
          }

          //update score for post in page or token
          const level = [0, 1, 10, 100, 1000];
          const postCreatedAt = new Date(post.createdAt).getTime();
          if (post.pageId) {
            const keyPage = template(`${BurnFanoutProcessor.pageTimelineKey}`, { pageId: post.pageId });
            pipeline.zincrby(keyPage, score, timelineId);
            pipeline.zincrby(BurnFanoutProcessor.feedPageTimeline, score, post.pageId);

            for (let i = 0; i < level.length; i++) {
              const keyPageByTimeWithDanaFilter = template(
                `${BurnFanoutProcessor.pageTimelineByTimeWithDanaFilterKey}`,
                {
                  pageId: post.pageId,
                  level: level[i]
                }
              );

              if (latestDanaBurnScore < level[i]) {
                pipeline.zrem(keyPageByTimeWithDanaFilter, timelineId);
              }

              if (latestDanaBurnScore >= level[i]) {
                pipeline.zadd(keyPageByTimeWithDanaFilter, postCreatedAt, timelineId);
              }
            }

            //If latestDanaBurnScore is negative, add postId to pageTimelineByTimeNoLevelShowNegativeKey
            if (latestDanaBurnScore < 0) {
              pipeline.zadd(
                template(`${BurnFanoutProcessor.pageTimelineByTimeShowAll}`, { pageId: post.pageId }),
                postCreatedAt,
                timelineId
              );
            }
          } else if (post.tokenId) {
            const keyToken = template(`${BurnFanoutProcessor.tokenTimelineKey}`, { tokenId: post.tokenId });
            pipeline.zincrby(keyToken, score, timelineId);
            pipeline.zincrby(BurnFanoutProcessor.feedTokenTimeline, score, post.tokenId);

            for (let i = 0; i < level.length; i++) {
              const keyTokenByTimeWithDanaFilter = template(
                `${BurnFanoutProcessor.tokenTimelineByTimeWithDanaFilterKey}`,
                {
                  tokenId: post.tokenId,
                  level: level[i]
                }
              );

              if (latestDanaBurnScore < level[i]) {
                pipeline.zrem(keyTokenByTimeWithDanaFilter, timelineId);
              }

              if (latestDanaBurnScore >= level[i]) {
                pipeline.zadd(keyTokenByTimeWithDanaFilter, postCreatedAt, timelineId);
              }
            }

            //If latestDanaBurnScore is negative, add postId to tokenTimelineByTimeNoLevelShowNegativeKey
            if (latestDanaBurnScore < 0) {
              pipeline.zadd(
                template(`${BurnFanoutProcessor.tokenTimelineByTimeShowAll}`, { tokenId: post.tokenId }),
                postCreatedAt,
                timelineId
              );
            }
          }

          //update score for post in profile
          const keyProfile = template(`${BurnFanoutProcessor.profileTimelineKey}`, { accountId: post.accountId });
          pipeline.zincrby(keyProfile, score, timelineId);
          //update time for post in profile
          for (let i = 0; i < level.length; i++) {
            const keyProfileByTimeWithDanaFilter = template(
              `${BurnFanoutProcessor.profileTimelineByTimeWithDanaFilterKey}`,
              {
                accountId: post.accountId,
                level: level[i]
              }
            );

            if (latestDanaBurnScore < level[i]) {
              pipeline.zrem(keyProfileByTimeWithDanaFilter, timelineId);
            }

            if (latestDanaBurnScore >= level[i]) {
              pipeline.zadd(keyProfileByTimeWithDanaFilter, postCreatedAt, timelineId);
            }
          }

          //If latestDanaBurnScore is negative, add postId to proflieTimelineByTimeNoLevelShowNegativeKey
          if (latestDanaBurnScore < 0) {
            pipeline.zadd(
              template(`${BurnFanoutProcessor.profileTimelineByTimeShowAll}`, { accountId: post.accountId }),
              postCreatedAt,
              timelineId
            );
          }
          break;
        case BurnForType.Page:
          pipeline.zincrby(BurnFanoutProcessor.feedPageTimeline, score, burnForId);
          break;
        case BurnForType.Token:
          const hoursPerMonth = 12 * 2 * 30;
          const scoreForToken = burn.burnType
            ? amountDana * Math.pow(2, diffHour / hoursPerMonth)
            : -amountDana * Math.pow(2, diffHour / hoursPerMonth);
          pipeline.zincrby(BurnFanoutProcessor.feedTokenTimeline, scoreForToken, burnForId);
          break;
      }

      await pipeline.exec();
    } catch (error) {
      this.logger.error(error);
      return false;
    }
    return true;
  }
}
