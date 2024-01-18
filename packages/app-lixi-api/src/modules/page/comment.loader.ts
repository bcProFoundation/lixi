import { Comment, CommentType, Commentable } from '@bcpros/lixi-models';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import _ from 'lodash';
import { PrismaService } from '../prisma/prisma.service';
import { Redis } from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { RedisDataLoader } from '../../common/redis/redis-dataloader';

@Injectable({ scope: Scope.REQUEST })
export default class CommentLoader {
  constructor(private readonly prisma: PrismaService, @InjectRedis() private readonly redis: Redis) {}

  public readonly batchCommentable = new RedisDataLoader(
    this.redis,
    'dataloader:CommentLoader:batchCommentable',
    new DataLoader(
      async (commentableIds: readonly string[]) => {
        const ids = commentableIds as unknown as string[];
        const commentables = await this.prisma.commentable.findMany({
          where: {
            id: {
              in: ids
            }
          }
        });

        const itemsMap = new Map();

        const groups = _.groupBy(commentables, item => {
          return _.get(item, 'type');
        });
        for (const group of _.keys(groups)) {
          const idsInGroup = groups[group].map(item => item.id);
          switch (group) {
            case CommentType.POST:
              const posts = await this.prisma.post.findMany({
                where: {
                  commentableId: {
                    in: idsInGroup
                  }
                },
                select: {
                  id: true,
                  commentableId: true
                }
              });
              for (const post of posts) {
                if (post && post.commentableId) {
                  const commentable = new Commentable({
                    id: post.commentableId,
                    type: CommentType.POST,
                    commentToId: post.id
                  });
                  itemsMap.set(`${post.commentableId}`, commentable);
                }
              }
            default:
              break;
          }
        }

        return commentableIds.map(commentableId => {
          return itemsMap.get(commentableId) ? itemsMap.get(commentableId) : null;
        });
      },
      { cache: false }
    ),
    {
      expire: 600,
      buffer: false
    }
  );

  public readonly batchParentOfReplyComment = new DataLoader(async (ids: readonly string[]) => {
    const commentIds = ids as unknown as string[];
    const mapResult = new Map();

    const result = await this.prisma.comment.findMany({
      where: { id: { in: commentIds } },
      include: { parent: true }
    });

    result.map(item => {
      mapResult.set(item.id, item.parent);
    });

    return ids.map(item => mapResult.get(item) ?? null);
  });
}
