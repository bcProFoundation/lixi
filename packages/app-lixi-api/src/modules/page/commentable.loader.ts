import { ICommentableTo } from '@bcpros/lixi-models';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import _ from 'lodash';
import { Redis } from 'ioredis';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { PrismaService } from '../prisma/prisma.service';
import { RedisDataLoader } from '../../common/redis/redis-dataloader';

@Injectable({ scope: Scope.REQUEST })
export default class CommentableLoader {
  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) { }

  public readonly batchTotalComments = new RedisDataLoader(
    this.redis,
    'dataloader:CommentableLoader:batchTotalComments',
    new DataLoader(
      async (commentableToArr: readonly ICommentableTo[]) => {
        const commentableIds = _.compact(commentableToArr.map(commentableTo => commentableTo.commentableId));
        const totalComments = await this.prisma.comment.groupBy({
          by: ['commentableId'],
          _count: {
            _all: true
          },
          where: {
            commentableId: {
              in: commentableIds
            }
          }
        });
        const totalCommentsMap = new Map(
          totalComments.map(value => {
            return [value.commentableId, value._count._all];
          })
        );
        return commentableToArr.map(commentableTo => {
          return commentableTo?.commentableId ? totalCommentsMap.get(commentableTo?.commentableId) : 0;
        });
      },
      { cache: false }
    ),
    {
      expire: 600,
      buffer: false,
      serialize: value => {
        return value ? value.toString() : '0';
      },
      deserialize: value => {
        return _.toSafeInteger(value);
      },
      cacheKeyFn: (commentableTo: ICommentableTo) => `${commentableTo.id}:${commentableTo.commentableId}`
    }
  );
}
