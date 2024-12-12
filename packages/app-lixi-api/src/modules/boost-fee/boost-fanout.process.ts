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
import { BoostFee, Post } from '@bcpros/lixi-models';
import { template } from 'src/utils/stringTemplate';
import ReSearch from 'src/common/redis/redis-search';
import { IndexNameOffer } from '../escrow/escrow.contants';

@Injectable()
@Processor(BOOST_FANOUT_QUEUE, { concurrency: 50 })
export class BoostFanoutProcessor extends WorkerHost {
  private logger: Logger = new Logger(this.constructor.name);

  //timeline for offer boost
  static offerBoostingTimeline = 'timeline:offer:boosting:showAll';
  static timelineOfferFilter = 'timeline:offer:{{keyFilter}}';

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
      //update score of post in hometimeline
      pipeline.zincrby(BoostFanoutProcessor.offerBoostingTimeline, score, timelineId);

      //update score of post in cache (country-state-method)
      post.offer?.paymentMethods?.map(item => {
        const keyPaymentMethod = `offer:method:{${item.paymentMethodId}}`;
        pipeline.zincrby(keyPaymentMethod, score, timelineId);
      });

      //add cache for country - state - city (offer:country:{countryName})
      const countryCode = post.offer?.location?.iso2 ?? post.offer?.country?.iso2 ?? null;
      let adminCode = post.offer?.location?.adminCode ?? null;
      let cityName = post.offer?.location?.cityAscii ?? null;

      //replace - in str to _
      if (adminCode) {
        adminCode = adminCode.replace(/-/g, '_');
      }
      if (cityName) {
        cityName = cityName.replace(/-/g, '_');
      }

      //cash in person
      if (post.offer?.location) {
        const keyCountry = `offer:country:{${countryCode}}`;
        pipeline.zincrby(keyCountry, score, timelineId);

        const keyState = `offer:state:{${adminCode}}`;
        pipeline.zincrby(keyState, score, timelineId);

        const keyCity = `offer:city:{${cityName}}`;
        pipeline.zincrby(keyCity, score, timelineId);
      }

      // bank transfer
      if (post.offer?.country) {
        const keyCountry = `offer:country:{${countryCode}}`;
        pipeline.zincrby(keyCountry, score, timelineId);
      }

      if (post.offer?.coinPayment) {
        const keyCoin = `offer:coin:{${post.offer.coinPayment}}`;
        pipeline.zincrby(keyCoin, score, timelineId);
      }

      if (post.offer?.localCurrency) {
        const keyCurrency = `offer:currency:{${post.offer.localCurrency}}`;
        pipeline.zincrby(keyCurrency, score, timelineId);
      }

      const reSearch = new ReSearch(this.redis);
      //create index if not exist
      const existIndex = await reSearch.exist(IndexNameOffer);
      if (!existIndex) {
        await reSearch.create(IndexNameOffer, true, ['1', 'docOffer:'], {
          countryCode: 'TEXT',
          adminCode: 'TEXT',
          city: 'TEXT',
          methods: 'TAG',
          coin: 'TEXT',
          currency: 'TEXT'
        });
      }

      //search item
      const methodIds = post?.offer?.paymentMethods?.map(item => item.paymentMethodId).join('|'); // 1|2|3
      const queryItem = `@countryCode:${countryCode}|@adminCode:${adminCode}|@city:${cityName}|@coin:${post?.offer?.coinPayment}|@currency:${post?.offer?.localCurrency}|@methods:{${methodIds}}`;
      const searchResult = await reSearch.search(IndexNameOffer, queryItem);
      //add item to search result
      if (searchResult.length > 0) {
        //search return result: [total item, keyItem1, valueItem1, keyItem2, valueItem2,...]
        for (let i = 1; i < searchResult.length; i += 2) {
          const keyDoc = searchResult[i];
          //get keyFilter, key doc: lixilotus:docOffer:keyFilter
          const arrKeyDoc = keyDoc.split('docOffer:');
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
          const keyTimelineFilter = template(`${BoostFanoutProcessor.timelineOfferFilter}`, { keyFilter });
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
