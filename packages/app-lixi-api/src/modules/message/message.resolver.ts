import {
  Account,
  CreateMessageInput,
  Message,
  MessageConnection,
  MessageOrder,
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
@Resolver(() => Message)
@UseFilters(GqlHttpExceptionFilter)
export class MessageResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private meiliService: MeiliService,
    @I18n() private i18n: I18nService,
    private messageGateway: MessageGateway
  ) {}

  @Subscription(() => Message)
  messageCreated() {
    return pubSub.asyncIterator('messageCreated');
  }

  @Query(() => Message)
  async message(@Args('id', { type: () => String }) id: string) {
    const result = await this.prisma.message.findUnique({
      where: { id: id }
    });

    return result;
  }

  @Query(() => MessageConnection)
  async allMessageByPageMessageSessionId(
    @Args() { after, before, first, last }: PaginationArgs,
    @Args({ name: 'id', type: () => String, nullable: true }) id: string,
    @Args({
      name: 'orderBy',
      type: () => MessageOrder,
      nullable: true
    })
    orderBy: MessageOrder
  ) {
    const result = await findManyCursorConnection(
      args =>
        this.prisma.message.findMany({
          include: { author: true },
          where: {
            pageMessageSessionId: id
          },
          orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
          ...args
        }),
      () =>
        this.prisma.message.count({
          where: {
            pageMessageSessionId: id
          }
        }),
      { first, last, before, after }
    );
    return result;
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Message)
  async createMessage(@AccountEntity() account: Account, @Args('data') data: CreateMessageInput) {
    if (!account) {
      const couldNotFindAccount = this.i18n.t('post.messages.couldNotFindAccount');
      throw new Error(couldNotFindAccount);
    }

    const { authorId, body, isPageOwner, pageMessageSessionId } = data;

    const message = await this.prisma.message.create({
      data: {
        body: body,
        isPageOwner: isPageOwner ?? false,
        author: { connect: { id: authorId } },
        pageMessageSession: { connect: { id: pageMessageSessionId } }
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      }
    });

    const result = {
      ...message,
      pageMessageSessionId: pageMessageSessionId
    };

    this.messageGateway.publishMessage(pageMessageSessionId!, result);

    return result;
  }

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

  // @ResolveField()
  // async avatar(@Parent() worshipedPerson: WorshipedPerson) {
  //   const avatar = this.prisma.uploadDetail.findFirst({
  //     where: {
  //       worshipedPersonAvatarId: worshipedPerson.id
  //     },
  //     include: {
  //       upload: {
  //         select: {
  //           id: true,
  //           sha: true,
  //           bucket: true,
  //           width: true,
  //           height: true,
  //           sha800: true,
  //           sha320: true,
  //           sha40: true
  //         }
  //       }
  //     }
  //   });
  //   return avatar;
  // }
}
