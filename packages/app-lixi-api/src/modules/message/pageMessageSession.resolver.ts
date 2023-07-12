import {
  MessageSessionConnection,
  MessageSessionOrder,
  PageMessageSessionConnection,
  PageMessageSessionOrder
} from '@bcpros/lixi-models';
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
          include: {
            account: true,
            lixi: true
          },
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
          include: {
            page: true,
            lixi: true
          },
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

  //This is for user only
  @Query(() => PageMessageSession)
  async userHadMessageToPage(
    @Args({ name: 'accountId', type: () => Number, nullable: true }) accountId: number,
    @Args({ name: 'pageId', type: () => String, nullable: true }) pageId: string
  ) {
    const result = await this.prisma.pageMessageSession.findFirst({
      include: {
        account: true,
        page: true
      },
      where: {
        AND: [
          {
            accountId: accountId
          },
          {
            pageId: pageId
          }
        ]
      }
    });
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

    //check if exsited else create new
    const pageMessageSessionExsited = await this.prisma.pageMessageSession.findFirst({
      where: {
        AND: [
          {
            accountId: accountId
          },
          {
            pageId: pageId
          }
        ]
      }
    });

    if (!pageMessageSessionExsited) {
      const result = await this.prisma.pageMessageSession.create({
        include: {
          page: true,
          account: true
        },
        data: {
          account: { connect: { id: accountId } },
          page: { connect: { id: pageId } }
        }
      });

      this.messageGateway.publishPageChannel(pageId, result);

      return result;
    }
  }

  @ResolveField()
  async lixi(@Parent() pageMessageSession: PageMessageSession) {
    const lixi = await this.prisma.lixi.findFirst({
      where: {
        pageMessageSession: {
          id: pageMessageSession.id
        }
      }
    });
    return lixi;
  }

  @ResolveField()
  async account(@Parent() pageMessageSession: PageMessageSession) {
    const account = await this.prisma.account.findFirst({
      where: {
        id: pageMessageSession.account.id
      }
    });
    return account;
  }

  @ResolveField()
  async page(@Parent() pageMessageSession: PageMessageSession) {
    const page = await this.prisma.page.findFirst({
      where: {
        id: pageMessageSession.page.id
      }
    });
    return page;
  }
}
