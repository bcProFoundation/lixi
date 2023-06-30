import { PageMessageSessionConnection, PageMessageSessionOrder } from '@bcpros/lixi-models';
import {
  Account,
  CreatePageMessageInput,
  Message,
  MessageConnection,
  MessageOrder,
  MessageSession,
  PageMessageSession,
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
@Resolver(() => PageMessageSession)
@UseFilters(GqlHttpExceptionFilter)
export class PageMessageSessionResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private meiliService: MeiliService,
    @I18n() private i18n: I18nService,
    private messageGateway: MessageGateway
  ) {}

  @Subscription(() => PageMessageSession)
  pageMessageSessionCreated() {
    return pubSub.asyncIterator('pageMessageSessionCreated');
  }

  @Query(() => PageMessageSession)
  async pageMessageSession(@Args('id', { type: () => String }) id: string) {
    const result = await this.prisma.pageMessageSession.findUnique({
      where: { id: id }
    });

    return result;
  }

  @Query(() => PageMessageSessionConnection)
  async allPageMessageSessionByPageId(
    @Args() { after, before, first, last }: PaginationArgs,
    @Args({ name: 'id', type: () => String, nullable: true }) id: string,
    @Args({
      name: 'orderBy',
      type: () => PageMessageSessionOrder,
      nullable: true
    })
    orderBy: PageMessageSessionOrder
  ) {
    const result = await findManyCursorConnection(
      args =>
        this.prisma.pageMessageSession.findMany({
          include: { messageSessions: true },
          where: {
            pageId: id
          },
          orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
          ...args
        }),
      () =>
        this.prisma.pageMessageSession.count({
          where: {
            pageId: id
          }
        }),
      { first, last, before, after }
    );
    return result;
  }

  @Query(() => PageMessageSessionConnection)
  async allPageMessageSessionByAccountId(
    @Args() { after, before, first, last }: PaginationArgs,
    @Args({ name: 'id', type: () => Number, nullable: true }) id: number,
    @Args({
      name: 'orderBy',
      type: () => PageMessageSessionOrder,
      nullable: true
    })
    orderBy: PageMessageSessionOrder
  ) {
    const result = await findManyCursorConnection(
      args =>
        this.prisma.pageMessageSession.findMany({
          include: { messageSessions: true },
          where: {
            accountId: id
          },
          orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
          ...args
        }),
      () =>
        this.prisma.pageMessageSession.count({
          where: {
            accountId: id
          }
        }),
      { first, last, before, after }
    );
    return result;
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => PageMessageSession)
  async createPageMessageSession(@AccountEntity() account: Account, @Args('data') data: CreatePageMessageInput) {
    if (!account) {
      const couldNotFindAccount = this.i18n.t('post.messages.couldNotFindAccount');
      throw new Error(couldNotFindAccount);
    }

    const { accountId, pageId } = data;

    const message = await this.prisma.pageMessageSession.create({
      data: {
        account: { connect: { id: accountId } },
        page: { connect: { id: pageId } }
      }
    });

    return message;
  }

  // @UseGuards(GqlJwtAuthGuard)
  // @Mutation(() => Worship)
  // async createWorship(@AccountEntity() account: Account, @Args('data') data: CreateWorshipInput) {
  //   if (!account) {
  //     const couldNotFindAccount = this.i18n.t('post.messages.couldNotFindAccount');
  //     throw new Error(couldNotFindAccount);
  //   }

  //   const { worshipedPersonId, worshipedAmount, location, longitude, latitude } = data;

  //   const person = await this.prisma.worshipedPerson.findFirst({
  //     where: {
  //       id: worshipedPersonId
  //     }
  //   });

  //   const newTotalAmount = person?.totalWorshipAmount ? person?.totalWorshipAmount + worshipedAmount : worshipedAmount;

  //   if (!person) {
  //     const couldNotFindPerson = this.i18n.t('worship.messages.couldNotFindPerson');
  //     throw new Error(couldNotFindPerson);
  //   }

  //   const personToWorship = {
  //     data: {
  //       account: {
  //         connect: {
  //           id: account.id
  //         }
  //       },
  //       worshipedPerson: {
  //         connect: {
  //           id: worshipedPersonId
  //         }
  //       },
  //       worshipedAmount: worshipedAmount,
  //       location: location || undefined,
  //       latitude: latitude || undefined,
  //       longitude: longitude || undefined
  //     }
  //   };
  //   const worshipedPerson = await this.prisma.worship.create({
  //     ...personToWorship,
  //     include: {
  //       account: {
  //         select: {
  //           id: true,
  //           name: true,
  //           address: true
  //         }
  //       },
  //       worshipedPerson: {
  //         select: {
  //           id: true,
  //           name: true,
  //           totalWorshipAmount: true
  //         }
  //       }
  //     }
  //   });

  //   await this.prisma.worshipedPerson.update({
  //     where: {
  //       id: person.id
  //     },
  //     data: {
  //       totalWorshipAmount: newTotalAmount
  //     }
  //   });

  //   if (person.yearOfDeath && moment().year() - person.yearOfDeath > 60)
  //     this.worshipGateway.publishWorship(worshipedPerson);

  //   pubSub.publish('personWorshiped', { personWorshiped: worshipedPerson });
  //   return worshipedPerson;
  // }

  // @UseGuards(GqlJwtAuthGuard)
  // @Mutation(() => Worship)
  // async createWorshipTemple(@AccountEntity() account: Account, @Args('data') data: CreateWorshipInput) {
  //   if (!account) {
  //     const couldNotFindAccount = this.i18n.t('post.messages.couldNotFindAccount');
  //     throw new Error(couldNotFindAccount);
  //   }

  //   const { templeId, worshipedAmount, location, longitude, latitude } = data;

  //   const temple = await this.prisma.temple.findFirst({
  //     where: {
  //       id: templeId
  //     }
  //   });

  //   const newTotalAmount = temple?.totalWorshipAmount ? temple?.totalWorshipAmount + worshipedAmount : worshipedAmount;

  //   if (!temple) {
  //     const couldNotFindTemple = this.i18n.t('worship.messages.couldNotFindTemple');
  //     throw new Error(couldNotFindTemple);
  //   }

  //   const templeToWorship = {
  //     data: {
  //       account: {
  //         connect: {
  //           id: account.id
  //         }
  //       },
  //       temple: {
  //         connect: {
  //           id: templeId
  //         }
  //       },
  //       worshipedAmount: worshipedAmount,
  //       location: location || undefined,
  //       latitude: latitude || undefined,
  //       longitude: longitude || undefined
  //     }
  //   };
  //   const worshipedTemple = await this.prisma.worship.create({
  //     ...templeToWorship,
  //     include: {
  //       account: {
  //         select: {
  //           id: true,
  //           name: true,
  //           address: true
  //         }
  //       },
  //       temple: {
  //         select: {
  //           id: true,
  //           name: true,
  //           totalWorshipAmount: true
  //         }
  //       }
  //     }
  //   });

  //   await this.prisma.temple.update({
  //     where: {
  //       id: temple.id
  //     },
  //     data: {
  //       totalWorshipAmount: newTotalAmount
  //     }
  //   });

  //   pubSub.publish('templeWorshiped', { templeWorshiped: worshipedTemple });
  //   return worshipedTemple;
  // }

  @ResolveField()
  async messageSessions(@Parent() pageMessageSession: PageMessageSession) {
    const messageSessions = this.prisma.messageSession.findFirst({
      where: {
        pageMessageSessionId: pageMessageSession.id
      }
    });
    return messageSessions;
  }
}
