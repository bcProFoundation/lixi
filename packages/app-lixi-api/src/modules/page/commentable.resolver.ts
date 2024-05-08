import { Comment, CommentTo, Commentable } from '@bcpros/lixi-models';
import BCHJS from '@bcpros/xpi-js';
import { Inject, Logger } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver, Subscription } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { ChronikClient } from 'chronik-client';
import { PubSub } from 'graphql-subscriptions';
import _ from 'lodash';
import { I18n, I18nService } from 'nestjs-i18n';
import { InjectChronikClient } from 'nestjs-chronik';
import { NotificationService } from 'src/common/modules/notifications/notification.service';
import { AccountCacheService } from '../account/account-cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { XPIJS } from '../wallet/wallet.constants';
import { CommentCacheService } from './comment-cache.service';

const pubSub = new PubSub();

@SkipThrottle()
@Resolver(() => Commentable)
export class CommentableResolver {
  private logger: Logger = new Logger(this.constructor.name);

  constructor(
    private prisma: PrismaService,
    @I18n() private i18n: I18nService,
    @InjectChronikClient('xpi') private chronik: ChronikClient,
    @Inject(XPIJS) private XPI: BCHJS,
    private readonly notificationService: NotificationService,
    private readonly accountCacheService: AccountCacheService,
    private readonly commentCacheService: CommentCacheService
  ) { }

  // @Subscription(() => Comment)
  // commentCreated() {
  //   return pubSub.asyncIterator('commentCreated');
  // }

  // @Query(() => Commentable)
  // async commentable(@Args('id', { type: () => String }) id: string) {

  //   return await this.commentCacheService.getById(id);
  // }

  // @ResolveField('commentTo', () => typeof CommentTo)
  // async commentTo(@Parent() commentable: Commentable) {
  //   const account = await this.accountCacheService.getById(_.toSafeInteger(comment.commentAccountId));
  //   return account;
  // }
}
