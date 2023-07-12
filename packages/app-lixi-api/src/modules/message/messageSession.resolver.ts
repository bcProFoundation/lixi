import {
  Account,
  CreateMessageSessionInput,
  Message,
  MessageConnection,
  MessageOrder,
  MessageSession,
  MessageSessionConnection,
  MessageSessionOrder,
  PaginationArgs
} from '@bcpros/lixi-models';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver, Subscription } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { PubSub } from 'graphql-subscriptions';
import * as _ from 'lodash';
import moment from 'moment';
import { I18n, I18nService } from 'nestjs-i18n';
import { connectionFromArraySlice } from 'src/common/custom-graphql-relay/arrayConnection';
import { AccountEntity } from 'src/decorators/account.decorator';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import ConnectionArgs, { getPagingParameters } from '../../common/custom-graphql-relay/connection.args';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwtauth.guard';
import { PERSON } from '../page/constants/meili.constants';
import { MeiliService } from '../page/meili.service';
import { PrismaService } from '../prisma/prisma.service';
import { MessageGateway } from './message.gateway';

const pubSub = new PubSub();

@SkipThrottle()
@Resolver(() => MessageSession)
@UseFilters(GqlHttpExceptionFilter)
export class MessageSessionResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private meiliService: MeiliService,
    @I18n() private i18n: I18nService,
    private messageGateway: MessageGateway
  ) {}

  // @Subscription(() => MessageSession)
  // messageSessionCreated() {
  //   return pubSub.asyncIterator('messageSessionCreated');
  // }

  // @Query(() => MessageSession)
  // async messageSession(@Args('id', { type: () => String }) id: string) {
  //   const result = await this.prisma.messageSession.findUnique({
  //     where: { id: id }
  //   });

  //   return result;
  // }

  // @Query(() => MessageSessionConnection)
  // async allMessageSessionByPageMessageSessionId(
  //   @Args() { after, before, first, last }: PaginationArgs,
  //   @Args({ name: 'id', type: () => String, nullable: true }) id: string,
  //   @Args({
  //     name: 'orderBy',
  //     type: () => MessageSessionOrder,
  //     nullable: true
  //   })
  //   orderBy: MessageSessionOrder
  // ) {
  //   const result = await findManyCursorConnection(
  //     args =>
  //       this.prisma.messageSession.findMany({
  //         include: {
  //           lixi: true,
  //           pageMessageSession: true
  //         },
  //         where: {
  //           pageMessageSessionId: id
  //         },
  //         orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
  //         ...args
  //       }),
  //     () =>
  //       this.prisma.messageSession.count({
  //         where: {
  //           pageMessageSessionId: id
  //         }
  //       }),
  //     { first, last, before, after }
  //   );
  //   return result;
  // }

  // @UseGuards(GqlJwtAuthGuard)
  // @Mutation(() => MessageSession)
  // async createMessageSession(@AccountEntity() account: Account, @Args('data') data: CreateMessageSessionInput) {
  //   if (!account) {
  //     const couldNotFindAccount = this.i18n.t('post.messages.couldNotFindAccount');
  //     throw new Error(couldNotFindAccount);
  //   }

  //   const { pageMessageSessionId } = data;

  //   const result = await this.prisma.messageSession.create({
  //     data: {
  //       pageMessageSessionId: pageMessageSessionId
  //     }
  //   });

  //   return result;
  // }

  // @ResolveField()
  // async pageMessageSession(@Parent() messageSession: MessageSession) {
  //   const pageMessageSession = await this.prisma.pageMessageSession.findFirst({
  //     where: {
  //       messageSessions: {
  //         every: {
  //           id: messageSession.id
  //         }
  //       }
  //     }
  //   });
  //   return pageMessageSession;
  // }

  // @ResolveField()
  // async lixi(@Parent() messageSession: MessageSession) {
  //   const lixi = await this.prisma.lixi.findFirst({
  //     where: {
  //       messageSession: {
  //         id: messageSession.id
  //       }
  //     }
  //   });
  //   return lixi;
  // }
}
