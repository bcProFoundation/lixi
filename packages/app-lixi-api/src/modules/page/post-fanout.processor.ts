import { PostType } from '@bcpros/lixi-prisma';
import { OfferType, Post } from '@bcpros/lixi-models';
import { InjectRedis } from '@songkeys/nestjs-redis';
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
import { newEpoch, offer_half_life } from 'src/utils/constants';
import ReSearch from 'src/common/redis/redis-search';
import {
  IndexNameBuyOffer,
  IndexNameOffer,
  KeyCacheNameBuyOffer,
  KeyCacheNameOffer,
  KeyIndexNameBuyOffer,
  KeyIndexNameOffer
} from '../escrow/escrow.contants';
import { createIndexOffer, sanitizeLocation } from 'src/utils/escrow/offer';

@Injectable()
@Processor(CONTENT_FANOUT_QUEUE, { concurrency: 50 })
export class PostFanoutProcessor extends WorkerHost {
  private logger: Logger = new Logger(this.constructor.name);

  static inNetworkSourceKey = 'timeline:innetwork:source';
  static outNetworkSourceKey = 'timeline:outnetwork:source';

  // page key
  static pageTimelineKey = 'timeline:page:{{pageId}}';
  static pageTimelineByTimeWithDanaFilterKey = 'timeline:page:{{pageId}}:{{level}}';
  static pageTimelineByTimeShowAll = 'timeline:page:{{pageId}}:showAll';

  // profile key
  static profileTimelineKey = 'timeline:profile:{{accountId}}';
  static profileTimelineByTimeWithDanaFilterKey = 'timeline:profile:{{accountId}}:{{level}}';
  static profileTimelineByTimeShowAll = 'timeline:profile:{{accountId}}:showAll';

  // token key
  static tokenTimelineKey = 'timeline:token:{{tokenId}}';
  static tokenTimelineByTimeWithDanaFilterKey = 'timeline:token:{{tokenId}}:{{level}}';
  static tokenTimelineByTimeShowAll = 'timeline:token:{{tokenId}}:showAll';

  // timeline for offer boost
  static offerBoostingTimeline = 'timeline:offer:boosting:showAll';
  static myOfferTimeline = 'timeline:offer:{{accountId}}:{{offerStatus}}';
  static timelineOfferFilter = 'timeline:offer:{{keyFilter}}';
  static timelineBuyOfferFilter = 'timeline:buyOffer:{{keyFilter}}';

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
      const diffHour = moment.duration(moment(post.createdAt).diff(moment(newEpoch))).asHours();
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
      const timelineId = `${post.type}:${id}`;
      for (const follower of followers) {
        const keyInNetwork = `${PostFanoutProcessor.inNetworkSourceKey}:${follower}`;
        pipeline.zincrby(keyInNetwork, score, timelineId);
      }

      // add default score when create post in page, token, profile
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

      // add default score for offer
      if (post.type === PostType.OFFER) {
        const isBuyOffer = post?.offer?.type === OfferType.BUY;

        const prefixOfferCache = `${isBuyOffer ? KeyCacheNameBuyOffer : KeyCacheNameOffer}:`;
        const offer_score = 1 * Math.pow(2, diffHour / offer_half_life);

        const myOfferTimelineKey = template(`${PostFanoutProcessor.myOfferTimeline}`, {
          accountId,
          offerStatus: post?.offer?.status
        });
        pipeline.zincrby(myOfferTimelineKey, postCreatedAt, timelineId);

        pipeline.zincrby(PostFanoutProcessor.offerBoostingTimeline, offer_score, timelineId);

        // add cache for payment method (offer:method:{id})
        post.offer?.paymentMethods.map(item => {
          const keyPaymentMethod = `${prefixOfferCache}method:{${item.paymentMethod.id}}`;
          pipeline.zincrby(keyPaymentMethod, offer_score, timelineId);
        });

        // add cache for country - state - city (offer:country:{countryName})
        const countryCode = post.offer?.location?.iso2 ?? post.offer?.country?.iso2 ?? null;
        const adminCode = sanitizeLocation(post.offer?.location?.adminCode ?? undefined);
        const cityName = sanitizeLocation(post.offer?.location?.cityAscii ?? undefined);

        // cash in person
        if (post.offer?.location) {
          const keyCountry = `${prefixOfferCache}country:{${countryCode}}`;
          pipeline.zincrby(keyCountry, offer_score, timelineId);

          const keyState = `${prefixOfferCache}state:{${adminCode}}`;
          pipeline.zincrby(keyState, offer_score, timelineId);

          const keyCity = `${prefixOfferCache}city:{${cityName}}`;
          pipeline.zincrby(keyCity, offer_score, timelineId);
        }

        // bank transfer
        if (post.offer?.country) {
          const keyCountry = `${prefixOfferCache}country:{${countryCode}}`;
          pipeline.zincrby(keyCountry, offer_score, timelineId);
        }

        if (post.offer?.coinPayment) {
          const keyCoin = `${prefixOfferCache}coin:{${post.offer.coinPayment}}`;
          pipeline.zincrby(keyCoin, offer_score, timelineId);
        }

        if (post.offer?.localCurrency) {
          const keyCurrency = `${prefixOfferCache}currency:{${post.offer.localCurrency}}`;
          pipeline.zincrby(keyCurrency, offer_score, timelineId);
        }

        // Create and use ReSearch index
        const reSearch = new ReSearch(this.redis);
        //create index if not exist
        await createIndexOffer(reSearch, post?.offer?.type ?? OfferType.BUY);

        // Build a query for searching relevant items
        const methodIds = post?.offer?.paymentMethods?.map(item => item.paymentMethodId).join('|'); // 1|2|3
        const queryItem = `@countryCode:${countryCode}|@adminCode:${adminCode}|@city:${cityName}|@coin:${post?.offer?.coinPayment}|@currency:${post?.offer?.localCurrency}|@methods:{${methodIds}}`;
        const indexName = isBuyOffer ? IndexNameBuyOffer : IndexNameOffer;
        const searchResult = await reSearch.search(indexName, queryItem);
        // add item to search result
        if (searchResult.length > 0) {
          // search return result: [total item, keyItem1, valueItem1, keyItem2, valueItem2,...]
          for (let i = 1; i < searchResult.length; i += 2) {
            const keyDoc = searchResult[i];
            // get keyFilter, key doc: lixilotus:docOffer:keyFilter
            const arrKeyDoc = keyDoc.split(`${isBuyOffer ? KeyIndexNameBuyOffer : KeyIndexNameOffer}:`);
            const keyFilter = arrKeyDoc[arrKeyDoc.length - 1];

            const keyFilterJson = JSON.parse(keyFilter);

            // if not have location, drop key have countryCode
            if (!countryCode) {
              if (keyFilterJson?.countryCode) continue;
            } else {
              // fetch all of item added and filter again, just add offer have field === indexField
              if (keyFilterJson?.adminCode && keyFilterJson.adminCode !== adminCode) continue;
              if (keyFilterJson?.cityName && keyFilterJson.cityName !== cityName) continue;
              if (keyFilterJson?.coin && keyFilterJson.coin !== post?.offer?.coinPayment) continue;
              if (keyFilterJson?.fiatCurrency && keyFilterJson.fiatCurrency !== post?.offer?.localCurrency) continue;
              if (
                keyFilterJson?.paymentMethodIds &&
                keyFilterJson?.paymentMethodIds.length > 0 &&
                keyFilterJson.paymentMethodIds[0].toString() !== methodIds
              )
                continue;
            }
            const keyTimelineFilter = template(
              `${isBuyOffer ? PostFanoutProcessor.timelineBuyOfferFilter : PostFanoutProcessor.timelineOfferFilter}`,
              { keyFilter }
            );
            pipeline.zincrby(keyTimelineFilter, offer_score, timelineId);
          }
        }
      }
      await pipeline.exec();
    } catch (error) {
      this.logger.error(error);
      return false;
    }
    return true;
  }
}
