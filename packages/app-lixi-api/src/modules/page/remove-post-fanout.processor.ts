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
import { REMOVE_POST_FANOUT_QUEUE } from './constants';
import { PostCacheService } from './post-cache.service';

@Injectable()
@Processor(REMOVE_POST_FANOUT_QUEUE, { concurrency: 50 })
export class RemovePostFanoutProcessor extends WorkerHost {
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

  //burn key
  static burnTimelineKey = 'timeline:burn:{{postId}}';

  //post key
  static postItemKey = 'items:posts:item-data';
  static postDanaItemKey = 'items:posts:dana';
  static postDanaViewItemKey = 'items:posts:item-data:danaview';

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
      const { id } = post;

      const accountId = post.accountId;
      const pageAccountId = post?.pageId;

      // Find all the followers
      const [accountFollowers, pageFollowers] = await Promise.all([
        this.followCacheService.getAccountFollowers(accountId),
        pageAccountId ? this.followCacheService.getPageFollowers(pageAccountId) : Promise.resolve([])
      ]);

      const followers = _.uniq(_.compact(_.concat(accountId, accountFollowers, pageFollowers)));

      // Clear the post from cache
      await this.postCacheService.removeByKeys([post.id]);

      //clear cache timeline
      const pipeline = this.redis.pipeline();

      // clear post cache innetwork
      const timelineId = `${PostType.POST}:${id}`;
      for (const follower of followers) {
        const keyInNetwork = `${RemovePostFanoutProcessor.inNetworkSourceKey}:${follower}`;
        pipeline.zrem(keyInNetwork, timelineId);
      }

      //clear post cache outnetwork
      pipeline.zrem(RemovePostFanoutProcessor.outNetworkSourceKey, timelineId);

      //clear burn timeline
      pipeline.del(template(RemovePostFanoutProcessor.burnTimelineKey, { postId: post.id }));

      //clear post-item data
      pipeline.hdel(RemovePostFanoutProcessor.postItemKey, post.id);
      pipeline.hdel(RemovePostFanoutProcessor.postDanaItemKey, post.id);
      pipeline.hdel(RemovePostFanoutProcessor.postDanaViewItemKey, post.id);

      //remove post in page, token, profile
      if (post.pageId) {
        const keyPage = template(`${RemovePostFanoutProcessor.pageTimelineKey}`, { pageId: post.pageId });
        const keyPageTimelineByTimeWithDanaFilter = template(
          `${RemovePostFanoutProcessor.pageTimelineByTimeWithDanaFilterKey}`,
          {
            pageId: post.pageId,
            level: 0
          }
        );
        const keyPageTimelineByTimeShowAll = template(`${RemovePostFanoutProcessor.pageTimelineByTimeShowAll}`, {
          pageId: post.pageId
        });

        pipeline.zrem(keyPage, timelineId);
        pipeline.zrem(keyPageTimelineByTimeWithDanaFilter, timelineId);
        pipeline.zrem(keyPageTimelineByTimeShowAll, timelineId);
      } else if (post.tokenId) {
        const keyToken = template(`${RemovePostFanoutProcessor.tokenTimelineKey}`, { tokenId: post.tokenId });
        const keyTokenTimelineByTimeWithDanaFilter = template(
          `${RemovePostFanoutProcessor.tokenTimelineByTimeWithDanaFilterKey}`,
          {
            tokenId: post.tokenId,
            level: 0
          }
        );
        const keyTokenTimelineByTimeShowAll = template(`${RemovePostFanoutProcessor.tokenTimelineByTimeShowAll}`, {
          tokenId: post.tokenId
        });

        pipeline.zrem(keyToken, timelineId);
        pipeline.zrem(keyTokenTimelineByTimeWithDanaFilter, timelineId);
        pipeline.zrem(keyTokenTimelineByTimeShowAll, timelineId);
      }

      const keyProfile = template(`${RemovePostFanoutProcessor.profileTimelineKey}`, { accountId: post.accountId });
      const keyProfileTimelineByTimeWithDanaFilter = template(
        `${RemovePostFanoutProcessor.profileTimelineByTimeWithDanaFilterKey}`,
        {
          accountId: post.accountId,
          level: 0
        }
      );
      const keyProfileTimelineByTimeShowAll = template(`${RemovePostFanoutProcessor.profileTimelineByTimeShowAll}`, {
        accountId: post.accountId
      });

      pipeline.zrem(keyProfile, timelineId);
      pipeline.zrem(keyProfileTimelineByTimeWithDanaFilter, timelineId);
      pipeline.zrem(keyProfileTimelineByTimeShowAll, timelineId);

      await pipeline.exec();
    } catch (error) {
      this.logger.error(error);
      return false;
    }
    return true;
  }
}
