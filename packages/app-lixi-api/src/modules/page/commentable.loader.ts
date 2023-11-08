import { ICommentableTo } from '@bcpros/lixi-models';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import _ from 'lodash';
import { PrismaService } from '../prisma/prisma.service';

@Injectable({ scope: Scope.REQUEST })
export default class CommentableLoader {
  constructor(private readonly prisma: PrismaService) {}

  public readonly batchTotalComments = new DataLoader(
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
    {
      cacheKeyFn: (commentableTo: ICommentableTo) => `${commentableTo.id}:${commentableTo.commentableId}`
    }
  );
}
