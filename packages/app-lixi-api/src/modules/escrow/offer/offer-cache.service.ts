import { BoostForType, COIN, Offer, OfferFilterInput, OfferStatus, OfferType, POST_TYPE } from '@bcpros/lixi-models';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { decode, encode } from '@msgpack/msgpack';
import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../../prisma/prisma.service';
import { basicSortedSetPagination } from 'src/common/custom-graphql-relay/paginate';
import { Prisma } from '@bcpros/lixi-prisma';
import { currency, epoch } from 'src/utils/constants';
import { template } from 'src/utils/stringTemplate';
import stringify from 'json-stable-stringify';
import { IndexNameOffer } from '../escrow.contants';
import ReSearch from 'src/common/redis/redis-search';

export class OfferCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:offers:item-data';

  //timeline for offer boost
  static offerBoostingTimeline = 'timeline:offer:boosting:showAll';
  static myOfferTimeline = 'timeline:offer:{{accountId}}:{{offerStatus}}';
  static timelineOfferFilter = 'timeline:offer:{{keyFilter}}';

  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis
  ) {}

  async getById(id: string): Promise<Nullable<Offer>> {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id);
    if (!buffer) {
      // cache miss
      const dbValue = await this.prisma.offer.findUnique({
        where: {
          postId: id
        }
      });
      if (!dbValue) return null;

      const offer: Offer = new Offer({
        ...dbValue,
        coin: dbValue?.coin as COIN,
        type: dbValue?.type as OfferType,
        status: dbValue?.status as OfferStatus
      });

      await this.redis.hset(this.keyPrefix, id, Buffer.from(encode(offer)));

      return offer;
    }

    const offer = decode(buffer) as Offer;
    return new Offer({ ...offer });
  }

  async getByIds(ids: string[]) {
    if (ids.length === 0) return [];

    const values = await this.redis.hmgetBuffer(this.keyPrefix, ...ids);
    const uncachedIds = [];
    for (let i = 0; i < ids.length; i++) {
      if (!values[i] && ids[i]) {
        uncachedIds.push(ids[i]);
      }
    }
    const itemsMap = new Map(
      _.compact(values).map(value => {
        const item = decode(value) as Offer;
        return [item.postId, item];
      })
    );

    const dbValues =
      uncachedIds.length > 0
        ? await this.prisma.offer.findMany({
            where: {
              postId: { in: uncachedIds }
            }
          })
        : [];

    const dbValuesMap = new Map(
      dbValues.map((dbValue, i) => {
        const item = new Offer({
          ...dbValue,
          coin: dbValue?.coin as COIN,
          type: dbValue?.type as OfferType,
          status: dbValue?.status as OfferStatus
        });
        itemsMap.set(dbValue.postId, item);
        return [dbValue.postId, Buffer.from(encode(item))];
      })
    );

    // Set value to cache
    if (dbValuesMap.size > 0) {
      await this.redis.hmset(this.keyPrefix, dbValuesMap);
    }

    return ids.map(id => {
      const item = itemsMap.get(id);
      return item ? new Offer({ ...item }) : null;
    });
  }

  async removeByKeys(keys: string[]) {
    await this.redis.hdel(this.keyPrefix, ...keys);
  }

  async changeStatusOffer(accountId: number, offerId: string, createdAt: Date) {
    //find all sorted set have "offer" and remove key in it
    const allKeys = await this.redis.keys('*offer*');
    const timelineId = `${POST_TYPE.OFFER}:${offerId}`;
    const pipeline = this.redis.pipeline();

    for (const key of allKeys) {
      // Check if the key is a sorted set
      const keyRemovePrefix = key.replace(/^lixilotus:/, '');
      const type = await this.redis.type(keyRemovePrefix);
      if (type === 'zset') {
        // Add the ZREM command to the pipeline for each sorted set
        pipeline.zrem(keyRemovePrefix, timelineId);
      }
    }

    //add that key to archive cache
    const keyAdded = template(`${OfferCacheService.myOfferTimeline}`, { accountId, offerStatus: OfferStatus.ARCHIVE });
    pipeline.zincrby(keyAdded, createdAt.getTime(), timelineId);

    await pipeline.exec();
  }

  async getOfferPaginatedTimeline(first: number = 20, after?: string) {
    const key = OfferCacheService.offerBoostingTimeline;
    const limit = 1000;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this.cacheOfferTimelineByScore(limit);
    }
    const paginated = await basicSortedSetPagination(this.redis, key, first, after);
    const hasNextPage = paginated.pageInfo.hasNextPage;
    if (!hasNextPage) {
      const offset = paginated.totalCount;
      const shouldPaginate = await this.cacheOfferTimelineByScore(limit, offset);
      if (shouldPaginate) {
        return await basicSortedSetPagination(this.redis, key, first, after);
      }
    }
    // nothing change
    return paginated;
  }

  async getOfferFilterPaginatedTimeline(offerFilterInput: OfferFilterInput, first: number = 20, after?: string) {
    const { countryId, stateId, paymentMethodIds } = offerFilterInput;
    //sort array payment
    if (paymentMethodIds && paymentMethodIds.length > 0) {
      offerFilterInput.paymentMethodIds = offerFilterInput.paymentMethodIds?.sort();
    }
    const keyFilter = _.isObject(offerFilterInput) ? stringify(offerFilterInput) : offerFilterInput;

    const keyTimeline = template(`${OfferCacheService.timelineOfferFilter}`, { keyFilter });
    const exist = await this.redis.exists([keyTimeline]);
    if (!exist) {
      await this.cacheOfferFilterTimeline(offerFilterInput, keyTimeline, keyFilter);
    }
    const paginated = await basicSortedSetPagination(this.redis, keyTimeline, first, after);
    const hasNextPage = paginated.pageInfo.hasNextPage;
    if (!hasNextPage) {
      const shouldPaginate = await this.cacheOfferFilterTimeline(offerFilterInput, keyTimeline, keyFilter);
      if (shouldPaginate) {
        return await basicSortedSetPagination(this.redis, keyTimeline, first, after);
      }
    }
    // nothing change
    return paginated;
  }

  async getPaginatedMyOfferTimelineByTime(
    accountId: number,
    offerStatus: OfferStatus,
    first: number = 20,
    after?: string
  ) {
    const key = template(`${OfferCacheService.myOfferTimeline}`, { accountId, offerStatus });
    const limit = 1000;
    const exist = await this.redis.exists([key]);
    if (!exist) {
      await this.cacheMyOfferTimelineByTime(accountId, offerStatus, limit);
    }
    const paginated = await basicSortedSetPagination(this.redis, key, first, after);
    const hasNextPage = paginated.pageInfo.hasNextPage;
    if (!hasNextPage) {
      const shouldPaginate = await this.cacheMyOfferTimelineByTime(accountId, offerStatus, limit, after);
      if (shouldPaginate) {
        return await basicSortedSetPagination(this.redis, key, first, after);
      }
    }
    // nothing change
    return paginated;
  }

  private async cacheOfferTimelineByScore(limit: number = 0, offset: number = 0) {
    const key = OfferCacheService.offerBoostingTimeline;
    const postBoostType = BoostForType.Post;
    const halfLife = '12 hours';
    const query = limit
      ? Prisma.sql`
      SELECT
        post.id,
        post.type,
        total_relevance(relevance_score(boost.boost_type, boost.created_at, ${epoch} :: timestamp, ${halfLife} :: interval, boost.boosted_value)) AS score 
      FROM
        post 
        JOIN
            boost_fee as boost 
            ON post.id = boost.boosted_for_id
      WHERE
        boost.boost_for_type = ${postBoostType} 
        AND boost.boosted_value > 0
      GROUP BY
        post.id 
      ORDER by
        score desc
      LIMIT ${limit}
      OFFSET ${offset}
    ;
  `
      : Prisma.sql`
      SELECT
        post.id,
        post.type,
        total_relevance(relevance_score(boost.boost_type, boost.created_at, ${epoch} :: timestamp, ${halfLife} :: interval, boost.boosted_value)) AS score 
      FROM
        post 
        JOIN
            boost_fee as boost 
            ON post.id = boost.boosted_for_id
      WHERE
      boost.boost_for_type = ${postBoostType} 
      AND boost.boosted_value > 0
      GROUP BY
        post.id 
      ORDER by
        score desc
      OFFSET ${offset}
      ;
    `;
    try {
      const posts = await this.prisma.$queryRaw<{ id: string; score: number; type: string }[]>(query);

      // Check if there are any posts
      // If not means that we should not need to query anymore
      if (posts.length == 0) return false;
      const pipeline = this.redis.pipeline();
      for (const post of posts) {
        const id = `${post.type}:${post.id}`;
        pipeline.zincrby(key, post.score ?? 0, id);
      }
      pipeline.expire(key, 2592000);
      await pipeline.exec();
      return true;
    } catch (err) {
      this.logger.error(err);
    }
  }

  private async cacheMyOfferTimelineByTime(
    accountId: number,
    offerStatus: OfferStatus,
    limit: number = 0,
    cursor?: string
  ) {
    const key = template(`${OfferCacheService.myOfferTimeline}`, { accountId, offerStatus });
    try {
      //query all post with of account
      const posts = cursor
        ? await this.prisma.post.findMany({
            select: {
              id: true,
              type: true,
              createdAt: true
            },
            where: {
              accountId,
              offer: {
                status: offerStatus
              }
            },
            orderBy: {
              createdAt: 'desc'
            },
            cursor: { id: cursor ? cursor : undefined },
            take: limit,
            skip: 1 // skip cursor item
          })
        : await this.prisma.post.findMany({
            select: {
              id: true,
              type: true,
              createdAt: true
            },
            where: {
              accountId,
              offer: {
                status: offerStatus
              }
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: limit
          });

      // Check if there are any posts
      // If not means that we should not need to query anymore
      if (posts.length == 0) return false;
      const pipeline = this.redis.pipeline();
      for (const post of posts) {
        const id = `${post.type}:${post.id}`;
        pipeline.zincrby(key, post.createdAt.getTime(), id);
      }
      pipeline.expire(key, 2592000);
      await pipeline.exec();
      return true;
    } catch (err) {
      this.logger.error(err);
    }
  }

  private async cacheOfferFilterTimeline(
    offerFilterInput: OfferFilterInput,
    combinationKey: string,
    keyFilter: string
  ) {
    try {
      const reSearch = new ReSearch(this.redis);
      const { countryId, stateId, paymentMethodIds, coin, fiatCurrency } = offerFilterInput;
      let keyPaymentMethods = '';
      let totalKeyPaymentMethods = 0;
      //get cache payment-methods
      if (paymentMethodIds && paymentMethodIds.length > 1) {
        keyPaymentMethods = `offer:method:{${paymentMethodIds.join('-')}}`;
        totalKeyPaymentMethods = paymentMethodIds.length;

        let multiSetUnion: string[] = [];
        for (let i = 0; i < totalKeyPaymentMethods; i++) {
          const keyMethod = `offer:method:{${paymentMethodIds[i]}}`;
          const existKeyMethod = await this.redis.exists([keyMethod]);
          if (!existKeyMethod) await this.cacheOfferMethodId(paymentMethodIds[i]);
          multiSetUnion.push(keyMethod);
        }

        await this.redis.zunionstore(keyPaymentMethods, totalKeyPaymentMethods, multiSetUnion, 'AGGREGATE', 'MAX');

        //expire key intermediate
        await this.redis.expire(keyPaymentMethods, 60 * 60 * 24 * 30); //1 month
      }

      //count total key intersect
      let totalKeyInter = 0;
      let multiSetInter: string[] = [];

      if (countryId) {
        //check key countryId
        const keyCountry = `offer:country:{${countryId}}`;
        const existKeyCountry = await this.redis.exists([keyCountry]);
        if (!existKeyCountry) this.cacheOfferCountryId(countryId);

        totalKeyInter += 1;
        multiSetInter.push(keyCountry);
      }
      if (stateId) {
        //check key stateId
        const keyState = `offer:state:{${stateId}}`;
        const existKeyState = await this.redis.exists([keyState]);
        if (!existKeyState) await this.cacheOfferStateId(stateId);

        totalKeyInter += 1;
        multiSetInter.push(`offer:state:{${stateId}}`);
      }
      if (coin) {
        //check key stateId
        const keyCoin = `offer:coin:{${coin}}`;
        const existKeyCoin = await this.redis.exists([keyCoin]);
        if (!existKeyCoin) await this.cacheOfferCoin(coin);

        totalKeyInter += 1;
        multiSetInter.push(`offer:coin:{${coin}}`);
      }
      if (fiatCurrency) {
        //check key stateId
        const keyCurrency = `offer:currency:{${currency}}`;
        const existKeyCurrency = await this.redis.exists([keyCurrency]);
        if (!existKeyCurrency) await this.cacheOfferCurrency(fiatCurrency);

        totalKeyInter += 1;
        multiSetInter.push(`offer:currency:{${fiatCurrency}}`);
      }
      if (totalKeyPaymentMethods !== 0) {
        //means have >2
        totalKeyInter += 1;
        multiSetInter.push(keyPaymentMethods);
      } else if (paymentMethodIds && paymentMethodIds.length === 1) {
        const keyMethod = `offer:method:{${paymentMethodIds[0]}}`;
        const existKeyMethod = await this.redis.exists([keyMethod]);
        if (!existKeyMethod) await this.cacheOfferMethodId(paymentMethodIds[0]);

        totalKeyInter += 1;
        multiSetInter.push(`offer:method:{${paymentMethodIds[0]}}`);
      }

      //intersect cache
      const docAdded = {
        countryId: offerFilterInput?.countryId?.toString() ?? '',
        stateId: offerFilterInput?.stateId?.toString() ?? '',
        methods: offerFilterInput?.paymentMethodIds?.map(item => `${item}`),
        coin: offerFilterInput?.coin ?? '',
        currency: offerFilterInput?.fiatCurrency ?? ''
      };
      //add cache and index
      Promise.all([
        this.redis.zinterstore(combinationKey, totalKeyInter, ...multiSetInter, 'AGGREGATE', 'MAX'),
        reSearch.add(IndexNameOffer, `docOffer:${keyFilter}`, docAdded)
      ]);

      //expire key
      await this.redis.expire(combinationKey, 60 * 60 * 24 * 30); //1 month

      return true;
    } catch (err) {
      this.logger.error(err);
      return false;
    }
  }

  private async cacheOfferCountryId(countryId: number) {
    const key = `offer:country:{${countryId}}`;
    const postBoostType = BoostForType.Post;
    const halfLife = '12 hours';
    const query = Prisma.sql`
      SELECT
        offer.post_id,
        total_relevance(relevance_score(boost.boost_type, boost.created_at, ${epoch} :: timestamp, ${halfLife} :: interval, boost.boosted_value)) AS score 
      FROM
        offer 
        JOIN
            boost_fee as boost 
            ON offer.post_id = boost.boosted_for_id
      WHERE
        boost.boost_for_type = ${postBoostType} 
        AND boost.boosted_value > 0
        AND offer.country_id = ${countryId}
      GROUP BY
        offer.post_id
      ORDER by
        score desc
    ;`;
    try {
      const posts = await this.prisma.$queryRaw<{ post_id: string; score: number }[]>(query);

      // Check if there are any posts
      // If not means that we should not need to query anymore
      if (posts.length == 0) return false;
      const pipeline = this.redis.pipeline();
      for (const post of posts) {
        const id = `${POST_TYPE.OFFER}:${post.post_id}`;
        pipeline.zincrby(key, post.score ?? 0, id);
      }
      await pipeline.exec();
      return true;
    } catch (err) {
      this.logger.error(err);
    }
  }

  private async cacheOfferStateId(stateId: number) {
    const key = `offer:state:{${stateId}}`;
    const postBoostType = BoostForType.Post;
    const halfLife = '12 hours';
    const query = Prisma.sql`
      SELECT
        offer.post_id,
        total_relevance(relevance_score(boost.boost_type, boost.created_at, ${epoch} :: timestamp, ${halfLife} :: interval, boost.boosted_value)) AS score 
      FROM
        offer 
        JOIN
            boost_fee as boost 
            ON offer.post_id = boost.boosted_for_id
      WHERE
        boost.boost_for_type = ${postBoostType} 
        AND boost.boosted_value > 0
        AND offer.state_id = ${stateId}
      GROUP BY
        offer.post_id
      ORDER by
        score desc
    ;`;
    try {
      const posts = await this.prisma.$queryRaw<{ post_id: string; score: number }[]>(query);

      // Check if there are any posts
      // If not means that we should not need to query anymore
      if (posts.length == 0) return false;
      const pipeline = this.redis.pipeline();
      for (const post of posts) {
        const id = `${POST_TYPE.OFFER}:${post.post_id}`;
        pipeline.zincrby(key, post.score ?? 0, id);
      }
      await pipeline.exec();
      return true;
    } catch (err) {
      this.logger.error(err);
    }
  }

  private async cacheOfferCoin(coin: string) {
    const key = `offer:coin:{${coin}}`;
    const postBoostType = BoostForType.Post;
    const halfLife = '12 hours';
    const query = Prisma.sql`
      SELECT
        offer.post_id,
        total_relevance(relevance_score(boost.boost_type, boost.created_at, ${epoch} :: timestamp, ${halfLife} :: interval, boost.boosted_value)) AS score 
      FROM
        offer 
        JOIN
            boost_fee as boost 
            ON offer.post_id = boost.boosted_for_id
      WHERE
        boost.boost_for_type = ${postBoostType} 
        AND boost.boosted_value > 0
        AND offer.coin_payment = ${coin}
      GROUP BY
        offer.post_id
      ORDER by
        score desc
    ;`;
    try {
      const posts = await this.prisma.$queryRaw<{ post_id: string; score: number }[]>(query);

      // Check if there are any posts
      // If not means that we should not need to query anymore
      if (posts.length == 0) return false;
      const pipeline = this.redis.pipeline();
      for (const post of posts) {
        const id = `${POST_TYPE.OFFER}:${post.post_id}`;
        pipeline.zincrby(key, post.score ?? 0, id);
      }
      await pipeline.exec();
      return true;
    } catch (err) {
      this.logger.error(err);
    }
  }

  private async cacheOfferCurrency(currency: string) {
    const key = `offer:currency:{${currency}}`;
    const postBoostType = BoostForType.Post;
    const halfLife = '12 hours';
    const query = Prisma.sql`
      SELECT
        offer.post_id,
        total_relevance(relevance_score(boost.boost_type, boost.created_at, ${epoch} :: timestamp, ${halfLife} :: interval, boost.boosted_value)) AS score 
      FROM
        offer 
        JOIN
            boost_fee as boost 
            ON offer.post_id = boost.boosted_for_id
      WHERE
        boost.boost_for_type = ${postBoostType} 
        AND boost.boosted_value > 0
        AND offer.local_currency = ${currency}
      GROUP BY
        offer.post_id
      ORDER by
        score desc
    ;`;
    try {
      const posts = await this.prisma.$queryRaw<{ post_id: string; score: number }[]>(query);

      // Check if there are any posts
      // If not means that we should not need to query anymore
      if (posts.length == 0) return false;
      const pipeline = this.redis.pipeline();
      for (const post of posts) {
        const id = `${POST_TYPE.OFFER}:${post.post_id}`;
        pipeline.zincrby(key, post.score ?? 0, id);
      }
      await pipeline.exec();
      return true;
    } catch (err) {
      this.logger.error(err);
    }
  }

  private async cacheOfferMethodId(methodId: number) {
    const key = `offer:method:{${methodId}}`;
    const postBoostType = BoostForType.Post;
    const halfLife = '12 hours';
    const query = Prisma.sql`
      SELECT
        offer.post_id,
        total_relevance(relevance_score(boost.boost_type, boost.created_at, ${epoch} :: timestamp, ${halfLife} :: interval, boost.boosted_value)) AS score 
      FROM
        offer 
        JOIN
            boost_fee as boost 
            ON offer.post_id = boost.boosted_for_id
        JOIN 
            offer_payment_method as method
            ON offer.post_id = method.offer_id
      WHERE
        boost.boost_for_type = ${postBoostType} 
        AND boost.boosted_value > 0
        AND method.payment_method_id = ${methodId}
      GROUP BY
        offer.post_id
      ORDER by
        score desc
    ;`;
    try {
      const posts = await this.prisma.$queryRaw<{ post_id: string; score: number }[]>(query);

      // Check if there are any posts
      // If not means that we should not need to query anymore
      if (posts.length == 0) return false;
      const pipeline = this.redis.pipeline();
      for (const post of posts) {
        const id = `${POST_TYPE.OFFER}:${post.post_id}`;
        pipeline.zincrby(key, post.score ?? 0, id);
      }
      await pipeline.exec();
      return true;
    } catch (err) {
      this.logger.error(err);
    }
  }
}
