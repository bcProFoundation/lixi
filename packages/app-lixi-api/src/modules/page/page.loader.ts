import _ from 'lodash';
import { Injectable, Scope } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import DataLoader from 'dataloader';
import { Page, Post, Repost, UploadDetail } from '@bcpros/lixi-models';
import { DanaViewScoreService } from './dana-view-score.service';
import { FollowCacheService } from '../account/follow-cache.service';

@Injectable({ scope: Scope.REQUEST })
export default class PageLoader {
  constructor(
    private readonly prisma: PrismaService,
    private readonly danaViewScoreService: DanaViewScoreService,
    private readonly followCacheService: FollowCacheService
  ) { }

  public async getPagesUploadsByBatch(pageIds: readonly string[]): Promise<(UploadDetail | any)[]> {
    const ids = pageIds as unknown as string[];
    const uploadsDb = await this.prisma.uploadDetail.findMany({
      where: {
        postId: { in: ids }
      },
      include: {
        upload: {
          select: {
            id: true,
            sha: true,
            bucket: true,
            width: true,
            height: true,
            cfImageId: true,
            cfImageFilename: true,
            originalFilename: true,
            extension: true,
            type: true,
            thumbnailHeight: true,
            thumbnailWidth: true
          }
        }
      }
    });
    const uploads = uploadsDb.map(item => {
      const upload: UploadDetail = {
        id: item.id,
        postId: item.postId,
        upload: {
          ...item.upload,
          sha: item.upload.sha || ''
        }
      };
      return upload;
    });

    return postIds.map(postId => {
      return uploads.filter(item => item.postId == postId) || null;
    });
  }
}