import { Post, PostDana, Repost, UploadDetail } from '@bcpros/lixi-models';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { decode, encode } from '@msgpack/msgpack';
import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../prisma/prisma.service';
import CommentableLoader from './commentable.loader';
import PostLoader from './post.loader';

export class PostCacheService {
  private logger: Logger = new Logger(this.constructor.name);
  private keyPrefix = 'items:posts:item-data';

  constructor(
    private readonly prisma: PrismaService,
    private readonly postLoader: PostLoader,
    private readonly commentableLoader: CommentableLoader,
    @InjectRedis() private readonly redis: Redis
  ) {}

  async getById(id: string): Promise<Nullable<Post>> {
    const buffer = await this.redis.hgetBuffer(this.keyPrefix, id);
    if (!buffer) {
      // cache miss
      const dbValue = await this.prisma.post.findUnique({
        where: {
          id: id
        },
        include: {
          postAccount: true,
          translations: true,
          token: true,
          _count: {
            select: { reposts: true }
          }
        }
      });
      if (!dbValue) return null;

      const [reposts, uploads, danaViewScore, postDanas] = await Promise.all([
        this.postLoader.batchReposts.load(dbValue.id),
        this.postLoader.batchUploads.load(dbValue.id),
        this.postLoader.batchDanaViewScores.load(dbValue.id),
        this.postLoader.batchPostDanas.load(dbValue.id)
      ]);

      const post: Post = new Post({
        ...dbValue,
        repostCount: dbValue._count.reposts,
        reposts: reposts ? (reposts as Repost[]) : [],
        danaBurnScore: (danaViewScore as number) || 0,
        postDana: postDanas
      });

      await this.redis.hset(this.keyPrefix, id, Buffer.from(encode(post)));

      return post;
    }

    const post = decode(buffer) as Post;
    return new Post({ ...post });
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
        const item = decode(value) as Post;
        return [item.id, item];
      })
    );

    const dbValues =
      uncachedIds.length > 0
        ? await this.prisma.post.findMany({
            where: {
              id: { in: uncachedIds }
            },
            include: {
              postAccount: true,
              translations: true,
              token: true,
              _count: {
                select: { reposts: true }
              }
            }
          })
        : [];

    const [arrReposts, arrUploads, arrDanaViewScore, arrPostDanas] = await Promise.all([
      this.postLoader.batchReposts.loadMany(uncachedIds),
      this.postLoader.batchUploads.loadMany(uncachedIds),
      this.postLoader.batchDanaViewScores.loadMany(ids),
      this.postLoader.batchPostDanas.loadMany(ids)
    ]);
    const dbValuesMap = new Map(
      dbValues.map((dbValue, i) => {
        const item = new Post({
          ...dbValue,
          id: dbValue.id,
          danaViewScore: (arrDanaViewScore[i] ?? 0) as number,
          repostCount: dbValue._count.reposts,
          reposts: arrReposts[i] ? (arrReposts[i] as Repost[]) : [],
          postDana: arrPostDanas[i] instanceof Error ? new PostDana({}) : (arrPostDanas[i] as PostDana)
        });
        itemsMap.set(dbValue.id, item);
        return [dbValue.id, Buffer.from(encode(item))];
      })
    );

    // Set value to cache
    if (dbValuesMap.size > 0) {
      await this.redis.hmset(this.keyPrefix, dbValuesMap);
    }

    return ids.map(id => {
      const item = itemsMap.get(id);
      return item ? new Post({ ...item }) : null;
    });
  }

  async removeByKeys(keys: string[]) {
    await this.redis.hdel(this.keyPrefix, ...keys);
  }
}
