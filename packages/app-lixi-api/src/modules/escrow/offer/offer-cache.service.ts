import { BoostForType, COIN, Offer, OfferFilterInput, OfferStatus, OfferType, POST_TYPE } from '@bcpros/lixi-models';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { decode, encode } from '@msgpack/msgpack';
import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../../prisma/prisma.service';
import { basicSortedSetPagination } from 'src/common/custom-graphql-relay/paginate';
import { Prisma } from '@bcpros/lixi-prisma';
import { newEpoch } from 'src/utils/constants';
import { template } from 'src/utils/stringTemplate';
import stringify from 'json-stable-stringify';
import {
  IndexNameBuyOffer,
  IndexNameOffer,
  KeyCacheNameBuyOffer,
  KeyCacheNameOffer,
  KeyIndexNameBuyOffer,
  KeyIndexNameOffer
} from '../escrow.contants';
import ReSearch from 'src/common/redis/redis-search';

export class OfferCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:offers:item-data';

  //timeline for offer boost
  static offerBoostingTimeline = 'timeline:offer:boosting:showAll';
  static myOfferTimeline = 'timeline:offer:{{accountId}}:{{offerStatus}}';
  static timelineOfferFilter = 'timeline:offer:{{keyFilter}}';
  static timelineBuyOfferFilter = 'timeline:buyOffer:{{keyFilter}}';

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
    // find all sorted set have "offer" and remove key in it
    const allOfferKeys = await this.redis.keys('*offer*');
    const timelineId = `${POST_TYPE.OFFER}:${offerId}`;
    const pipeline = this.redis.pipeline();

    for (const offerKey of allOfferKeys) {
      // Check if the key is a sorted set
      const keyRemovePrefix = offerKey.replace(/^lixilotus:/, '');
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

  async getOfferFilterPaginatedTimeline(
    isBuyOffer: boolean,
    offerFilterInput: OfferFilterInput,
    first: number = 20,
    after?: string
  ) {
    const { paymentMethodIds } = offerFilterInput;
    //sort array payment
    if (paymentMethodIds && paymentMethodIds.length > 0) {
      offerFilterInput.paymentMethodIds = offerFilterInput.paymentMethodIds?.sort();
    }
    const keyFilter = _.isObject(offerFilterInput) ? stringify(offerFilterInput) : offerFilterInput;

    const keyTimeline = template(
      `${isBuyOffer ? OfferCacheService.timelineBuyOfferFilter : OfferCacheService.timelineOfferFilter}`,
      { keyFilter }
    );
    const exist = await this.redis.exists([keyTimeline]);
    if (!exist) {
      await this.cacheOfferFilterTimeline(isBuyOffer, offerFilterInput, keyTimeline, keyFilter);
    }
    const paginated = await basicSortedSetPagination(this.redis, keyTimeline, first, after);
    const hasNextPage = paginated.pageInfo.hasNextPage;
    if (!hasNextPage) {
      const shouldPaginate = await this.cacheOfferFilterTimeline(isBuyOffer, offerFilterInput, keyTimeline, keyFilter);
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
    const halfLife = '168 hours';
    const query = limit
      ? Prisma.sql`
      SELECT
        post.id,
        post.type,
        total_relevance(relevance_score(boost.boost_type, boost.created_at, ${newEpoch} :: timestamp, ${halfLife} :: interval, boost.boosted_value)) AS score 
      FROM
        post 
        JOIN
            boost_fee as boost 
            ON post.id = boost.boosted_for_id
        JOIN
            offer 
            ON offer.post_id = post.id AND
            offer.status = 'ACTIVE' AND
            offer.hide_from_home = false
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
        total_relevance(relevance_score(boost.boost_type, boost.created_at, ${newEpoch} :: timestamp, ${halfLife} :: interval, boost.boosted_value)) AS score 
      FROM
        post 
        JOIN
            boost_fee as boost 
            ON post.id = boost.boosted_for_id
        JOIN
            offer 
            ON offer.post_id = post.id AND
            offer.status = 'ACTIVE' AND
            offer.hide_from_home = false
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
    isBuyOffer: boolean,
    offerFilterInput: OfferFilterInput,
    combinationKey: string,
    keyFilter: string
  ) {
    try {
      const reSearch = new ReSearch(this.redis);
      const prefixOfferCache = `${isBuyOffer ? KeyCacheNameBuyOffer : KeyCacheNameOffer}:`;
      const { countryCode, adminCode, cityName, paymentMethodIds, coin, fiatCurrency } = offerFilterInput;

      // STEP 1: Handle Payment Methods
      let keyPaymentMethods = '';
      let totalKeyPaymentMethods = 0;
      //get cache payment-methods
      if (paymentMethodIds && paymentMethodIds.length > 1) {
        keyPaymentMethods = `${prefixOfferCache}method:{${paymentMethodIds.join('-')}}`;
        totalKeyPaymentMethods = paymentMethodIds.length;

        let multiSetUnion: string[] = [];
        for (let i = 0; i < totalKeyPaymentMethods; i++) {
          const keyMethod = `${prefixOfferCache}method:{${paymentMethodIds[i]}}`;
          const existKeyMethod = await this.redis.exists([keyMethod]);
          if (!existKeyMethod) await this.cacheOfferMethodId(prefixOfferCache, paymentMethodIds[i]);
          multiSetUnion.push(keyMethod);
        }

        await this.redis.zunionstore(keyPaymentMethods, totalKeyPaymentMethods, multiSetUnion, 'AGGREGATE', 'MAX');

        //expire key intermediate
        await this.redis.expire(keyPaymentMethods, 60 * 60 * 24 * 30); //1 month
      }

      // STEP 2: Handle Standard Fields
      const fieldsToProcess = [
        {
          value: countryCode,
          prefixKey: 'country',
          isLocation: true,
          cacheFn: (val: string) => this.cacheOfferCountry(prefixOfferCache, val)
        },
        {
          value: adminCode,
          prefixKey: 'state',
          isLocation: true,
          cacheFn: (val: string) => this.cacheOfferState(prefixOfferCache, val)
        },
        {
          value: cityName,
          prefixKey: 'city',
          isLocation: true,
          cacheFn: (val: string) => this.cacheOfferCity(prefixOfferCache, val)
        },
        {
          value: coin,
          prefixKey: 'coin',
          isLocation: false,
          cacheFn: (val: string) => this.cacheOfferCoin(prefixOfferCache, val)
        },
        {
          value: fiatCurrency,
          prefixKey: 'currency',
          isLocation: false,
          cacheFn: (val: string) => this.cacheOfferCurrency(prefixOfferCache, val)
        }
      ];
      //count total key intersect
      let totalKeyInter = 0;
      let multiSetInter: string[] = [];

      // For each field, if there's a value, ensure the key is cached and add it to intersectKeys
      for (const field of fieldsToProcess) {
        if (!field.value) continue;

        // if methods > 2 and include 1 (cash), so we dont want to intersect with location
        if (totalKeyPaymentMethods !== 0 && paymentMethodIds?.includes(1) && field.isLocation) {
          continue;
        }

        const fieldKey = `${prefixOfferCache}${field.prefixKey}:{${field.value}}`;
        const existsFieldKey = await this.redis.exists([fieldKey]);
        if (!existsFieldKey) {
          await field.cacheFn(field.value);
        }
        multiSetInter.push(fieldKey);
        totalKeyInter += 1;
      }

      // Include union key payment-methods in intersect if we have them
      if (totalKeyPaymentMethods !== 0) {
        //means have >2
        totalKeyInter += 1;
        multiSetInter.push(keyPaymentMethods);
      } else if (paymentMethodIds && paymentMethodIds.length === 1) {
        const keyMethod = `${prefixOfferCache}method:{${paymentMethodIds[0]}}`;
        const existKeyMethod = await this.redis.exists([keyMethod]);
        if (!existKeyMethod) await this.cacheOfferMethodId(prefixOfferCache, paymentMethodIds[0]);

        totalKeyInter += 1;
        multiSetInter.push(`${prefixOfferCache}method:{${paymentMethodIds[0]}}`);
      }

      // STEP 3: Build Combination Key & Add Doc
      const docAdded = {
        countryCode: offerFilterInput?.countryCode ?? '',
        adminCode: offerFilterInput?.adminCode ?? '',
        city: offerFilterInput?.cityName ?? '',
        methods: offerFilterInput?.paymentMethodIds?.map(item => `${item}`),
        coin: offerFilterInput?.coin ?? '',
        currency: offerFilterInput?.fiatCurrency ?? ''
      };
      //add cache and index
      await Promise.all([
        this.redis.zinterstore(combinationKey, totalKeyInter, ...multiSetInter, 'AGGREGATE', 'MAX'),
        reSearch.add(
          isBuyOffer ? IndexNameBuyOffer : IndexNameOffer,
          `${isBuyOffer ? KeyIndexNameBuyOffer : KeyIndexNameOffer}:${keyFilter}`,
          docAdded
        )
      ]);

      //expire key
      await this.redis.expire(combinationKey, 60 * 60 * 24 * 30); //1 month

      return true;
    } catch (err) {
      this.logger.error(err);
      return false;
    }
  }

  private async cacheOfferCountry(prefixOfferCache: string, countryCode: string) {
    const key = `${prefixOfferCache}country:{${countryCode}}`;
    const postBoostType = BoostForType.Post;
    const halfLife = '168 hours';
    const query = Prisma.sql`
      SELECT
        offer.post_id,
        total_relevance(relevance_score(boost.boost_type, boost.created_at, ${newEpoch} :: timestamp, ${halfLife} :: interval, boost.boosted_value)) AS score 
      FROM
        offer 
        JOIN
            boost_fee as boost 
            ON offer.post_id = boost.boosted_for_id
        JOIN 
            world_cities as wc
            ON offer.location_id = wc.id
      WHERE
        boost.boost_for_type = ${postBoostType} 
        AND boost.boosted_value > 0
        AND wc.iso2 = ${countryCode}
        AND offer.hide_from_home = false
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

  private async cacheOfferState(prefixOfferCache: string, adminCode: string) {
    const key = `${prefixOfferCache}state:{${adminCode}}`;
    const postBoostType = BoostForType.Post;
    const halfLife = '168 hours';
    const query = Prisma.sql`
      SELECT
        offer.post_id,
        total_relevance(relevance_score(boost.boost_type, boost.created_at, ${newEpoch} :: timestamp, ${halfLife} :: interval, boost.boosted_value)) AS score 
      FROM
        offer 
        JOIN
            boost_fee as boost 
            ON offer.post_id = boost.boosted_for_id
        JOIN 
            world_cities as wc
            ON offer.location_id = wc.id
      WHERE
        boost.boost_for_type = ${postBoostType} 
        AND boost.boosted_value > 0
        AND wc.admin_code = ${adminCode}
        AND offer.hide_from_home = false
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

  private async cacheOfferCity(prefixOfferCache: string, city: string) {
    const key = `${prefixOfferCache}state:{${city}}`;
    const postBoostType = BoostForType.Post;
    const halfLife = '168 hours';
    const query = Prisma.sql`
      SELECT
        offer.post_id,
        total_relevance(relevance_score(boost.boost_type, boost.created_at, ${newEpoch} :: timestamp, ${halfLife} :: interval, boost.boosted_value)) AS score 
      FROM
        offer 
        JOIN
            boost_fee as boost 
            ON offer.post_id = boost.boosted_for_id
        JOIN 
            world_cities as wc
            ON offer.location_id = wc.id
      WHERE
        boost.boost_for_type = ${postBoostType} 
        AND boost.boosted_value > 0
        AND wc.city_ascii = ${city}
        and offer.hide_from_home = false
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

  private async cacheOfferCoin(prefixOfferCache: string, coin: string) {
    const key = `${prefixOfferCache}coin:{${coin}}`;
    const postBoostType = BoostForType.Post;
    const halfLife = '168 hours';
    const query = Prisma.sql`
      SELECT
        offer.post_id,
        total_relevance(relevance_score(boost.boost_type, boost.created_at, ${newEpoch} :: timestamp, ${halfLife} :: interval, boost.boosted_value)) AS score 
      FROM
        offer 
        JOIN
            boost_fee as boost 
            ON offer.post_id = boost.boosted_for_id
      WHERE
        boost.boost_for_type = ${postBoostType} 
        AND boost.boosted_value > 0
        AND offer.coin_payment = ${coin}
        AND offer.hide_from_home = false
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

  private async cacheOfferCurrency(prefixOfferCache: string, currency: string) {
    const key = `${prefixOfferCache}currency:{${currency}}`;
    const postBoostType = BoostForType.Post;
    const halfLife = '168 hours';
    const query = Prisma.sql`
      SELECT
        offer.post_id,
        total_relevance(relevance_score(boost.boost_type, boost.created_at, ${newEpoch} :: timestamp, ${halfLife} :: interval, boost.boosted_value)) AS score 
      FROM
        offer 
        JOIN
            boost_fee as boost 
            ON offer.post_id = boost.boosted_for_id
      WHERE
        boost.boost_for_type = ${postBoostType} 
        AND boost.boosted_value > 0
        AND offer.local_currency = ${currency}
        AND offer.hide_from_home = false
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

  private async cacheOfferMethodId(prefixOfferCache: string, methodId: number) {
    const key = `${prefixOfferCache}method:{${methodId}}`;
    const postBoostType = BoostForType.Post;
    const halfLife = '168 hours';
    const query = Prisma.sql`
      SELECT
        offer.post_id,
        total_relevance(relevance_score(boost.boost_type, boost.created_at, ${newEpoch} :: timestamp, ${halfLife} :: interval, boost.boosted_value)) AS score 
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
        AND offer.hide_from_home = false
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
