import { InjectRedis } from '@songkeys/nestjs-redis';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Redis } from 'ioredis';
import * as _ from 'lodash';
import moment from 'moment';
import { I18n, I18nService } from 'nestjs-i18n';
import { newEpoch, offer_half_life } from 'src/utils/constants';
import { BOOST_FANOUT_QUEUE } from './boost.constants';
import { BoostFee, OfferType, Post } from '@bcpros/lixi-models';
import { template } from 'src/utils/stringTemplate';
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
@Processor(BOOST_FANOUT_QUEUE, { concurrency: 50 })
export class BoostFanoutProcessor extends WorkerHost {
  private logger: Logger = new Logger(this.constructor.name);

  //timeline for offer boost
  static offerBoostingTimeline = 'timeline:offer:boosting:showAll';
  static timelineOfferFilter = 'timeline:offer:{{keyFilter}}';
  static timelineBuyOfferFilter = 'timeline:buyOffer:{{keyFilter}}';

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
      const isBuyOffer = post?.offer?.type === OfferType.BUY;
      const prefixOfferCache = `${isBuyOffer ? KeyCacheNameBuyOffer : KeyCacheNameOffer}`;

      // Invalidate the cache
      const diffHour = moment.duration(moment(boost.createdAt).diff(moment(newEpoch))).asHours();
      const score = boost.boostType
        ? boost.boostedValue * Math.pow(2, diffHour / offer_half_life)
        : -boost.boostedValue * Math.pow(2, diffHour / offer_half_life);

      const timelineId = `${post.type}:${id}`;

      const pipeline = this.redis.pipeline();
      //update score of post in hometimeline
      pipeline.zincrby(BoostFanoutProcessor.offerBoostingTimeline, score, timelineId);

      //update score of post in cache (country-state-method)
      post.offer?.paymentMethods?.map(item => {
        const keyPaymentMethod = `${prefixOfferCache}:method:{${item.paymentMethodId}}`;
        pipeline.zincrby(keyPaymentMethod, score, timelineId);
      });

      //add cache for country - state - city (offer:country:{countryName})
      const countryCode = post.offer?.location?.iso2 ?? post.offer?.country?.iso2 ?? null;
      const adminCode = sanitizeLocation(post.offer?.location?.adminCode ?? undefined);
      const cityName = sanitizeLocation(post.offer?.location?.cityAscii ?? undefined);

      //cash in person
      if (post.offer?.location) {
        const keyCountry = `${prefixOfferCache}:country:{${countryCode}}`;
        pipeline.zincrby(keyCountry, score, timelineId);

        const keyState = `${prefixOfferCache}:state:{${adminCode}}`;
        pipeline.zincrby(keyState, score, timelineId);

        const keyCity = `${prefixOfferCache}:city:{${cityName}}`;
        pipeline.zincrby(keyCity, score, timelineId);
      }

      // bank transfer
      if (post.offer?.country) {
        const keyCountry = `${prefixOfferCache}:country:{${countryCode}}`;
        pipeline.zincrby(keyCountry, score, timelineId);
      }

      if (post.offer?.coinPayment) {
        const keyCoin = `${prefixOfferCache}:coin:{${post.offer.coinPayment}}`;
        pipeline.zincrby(keyCoin, score, timelineId);
      }

      if (post.offer?.paymentApp) {
        const keyPaymentApp = `${prefixOfferCache}:paymentApp:{${post.offer.paymentApp}}`;
        pipeline.zincrby(keyPaymentApp, score, timelineId);
      }

      if (post.offer?.localCurrency) {
        const keyCurrency = `${prefixOfferCache}:currency:{${post.offer.localCurrency}}`;
        pipeline.zincrby(keyCurrency, score, timelineId);
      }

      const reSearch = new ReSearch(this.redis);
      //create index if not exist
      await createIndexOffer(reSearch, post?.offer?.type ?? OfferType.BUY);

      //search item
      const methodIds = post?.offer?.paymentMethods?.map(item => item.paymentMethodId).join('|'); // 1|2|3
      const queryItem = `@countryCode:${countryCode}|@adminCode:${adminCode}|@city:${cityName}|@coin:${post?.offer?.coinPayment}|@currency:${post?.offer?.localCurrency}|@paymentApp:${post?.offer?.paymentApp}|@methods:{${methodIds}}`;
      const searchResult = await reSearch.search(isBuyOffer ? IndexNameBuyOffer : IndexNameOffer, queryItem);
      //add item to search result
      if (searchResult.length > 0) {
        //search return result: [total item, keyItem1, valueItem1, keyItem2, valueItem2,...]
        for (let i = 1; i < searchResult.length; i += 2) {
          const keyDoc = searchResult[i];
          //get keyFilter, key doc: lixilotus:docOffer:keyFilter
          const arrKeyDoc = keyDoc.split(`${isBuyOffer ? KeyIndexNameBuyOffer : KeyIndexNameOffer}:`);
          const keyFilter = arrKeyDoc[arrKeyDoc.length - 1];

          const keyFilterJson = JSON.parse(keyFilter);

          //if not have location, drop key have countryCode
          if (!countryCode) {
            if (keyFilterJson?.countryCode) continue;
          } else {
            //fetch all of item added and filter again, just add offer have field === indexField
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
            `${isBuyOffer ? BoostFanoutProcessor.timelineBuyOfferFilter : BoostFanoutProcessor.timelineOfferFilter}`,
            { keyFilter }
          );
          pipeline.zincrby(keyTimelineFilter, score, timelineId);
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
