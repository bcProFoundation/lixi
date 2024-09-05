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
      post.offer?.paymentMethods.map(item => {
        const keyPaymentMethod = `offer:method:{${item.paymentMethod.id}}`;
        pipeline.zincrby(keyPaymentMethod, score, timelineId);
      });

      //add cache for country and state (offer:country:{countryId})
      const keyCountry = `offer:country:{${post.offer?.country?.id}}`;
      pipeline.zincrby(keyCountry, score, timelineId);

      //state is optional (offer:state:{stateId})
      if (post.offer?.state?.id) {
        const keyState = `offer:state:{${post.offer.state.id}}`;
        pipeline.zincrby(keyState, score, timelineId);
      }

      //find item have countryId|stateId|{in payment-method} by search and add offer to it
      const reSearch = new ReSearch(this.redis);
      //create index if not exist
      const existIndex = await reSearch.exist(IndexNameOffer);
      if (!existIndex) {
        await reSearch.create(IndexNameOffer, true, ['1', 'docOffer:'], {
          countryId: 'TEXT',
          stateId: 'TEXT',
          methods: 'TAG'
        });
      }

      //search item
      const methodIds = post?.offer?.paymentMethods?.map(item => item.paymentMethodId).join('|'); // 1|2|3
      const queryItem = `@countryId:${post?.offer?.countryId}|@stateId:${post?.offer?.stateId}|@methods:{${methodIds}}`;
      const searchResult = await reSearch.search(IndexNameOffer, queryItem);
      //add item to search result
      if (searchResult.length > 0) {
        //search return result: [total item, keyItem1, valueItem1, keyItem2, valueItem2,...]
        for (let i = 1; i < searchResult.length; i += 2) {
          const keyDoc = searchResult[i];
          //get keyFilter, key doc: lixilotus:docOffer:keyFilter
          const arrKeyDoc = keyDoc.split('docOffer:');
          const keyFilter = arrKeyDoc[arrKeyDoc.length - 1];
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
