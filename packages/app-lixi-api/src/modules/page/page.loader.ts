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
  ) {}
}
