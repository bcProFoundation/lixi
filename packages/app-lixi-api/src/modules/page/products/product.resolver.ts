import { Account, CreateProductInput, Page, Product } from '@bcpros/lixi-models';
import { HttpException, HttpStatus, Injectable, Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { I18n, I18nService } from 'nestjs-i18n';
import { AccountEntity, PageAccountEntity } from 'src/decorators';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import VError from 'verror';
import { GqlJwtAuthGuard } from '../../auth/guards/gql-jwtauth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import TimelineableLoader from '../timelineable.loader';
import { ProductCacheService } from './product-cache.service';
import { CommentType, ImageUploadableType, PostType } from '@bcpros/lixi-prisma';
import { FollowCacheService } from '../../account/follow-cache.service';
import { NotificationService } from '../../../common/modules/notifications/notification.service';
import { InjectChronikClient } from '../../../common/modules/chronik/chronik.decorators';
import { ChronikClient } from 'chronik-client';
import { AccountCacheService } from '../../account/account-cache.service';
import { NOTIFICATION_TYPES } from '../../../common/modules/notifications/notification.constants';

const pubSub = new PubSub();

@Injectable()
@Resolver(() => Product)
@UseFilters(GqlHttpExceptionFilter)
export class ProductResolver {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    @InjectChronikClient('xpi') private chronik: ChronikClient,
    private readonly followCacheService: FollowCacheService,
    private readonly accountCacheService: AccountCacheService,
    private readonly notificationService: NotificationService,
    private readonly productCacheService: ProductCacheService,
    private readonly timelineableLoader: TimelineableLoader,
    @I18n() private i18n: I18nService
  ) {}

  @Query(() => Product)
  async product(@Args('id', { type: () => String }) id: string) {
    return this.productCacheService.getById(id);
  }

  // @Query(() => ProductConnection)
  // async allProducts(
  //   @Args() { after, before, first, last }: PaginationArgs,
  //   @Args({ name: 'query', type: () => String, nullable: true })
  //   query: string,
  //   @Args({
  //     name: 'orderBy',
  //     type: () => ProductOrder,
  //     nullable: true
  //   })
  //   orderBy: ProductOrder
  // ) {
  //   const result = await findManyCursorConnection(
  //     async args => {
  //       const products = await this.prisma.product.findMany({
  //         orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
  //         ...args
  //       });

  //       const output = products.map(product => ({
  //         ...product
  //       }));
  //       return output;
  //     },
  //     () => this.prisma.product.count(),
  //     { first, last, before, after }
  //   );
  //   return result;
  // }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Product)
  async createProduct(@PageAccountEntity() account: Account, @Args('data') data: CreateProductInput) {
    if (!account) {
      const couldNotFindAccount = await this.i18n.t('page.messages.couldNotFindAccount');
      const error = new VError.WError(couldNotFindAccount);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const { uploads, title, categoryId, price, priceUnit, phoneNumber, pageId, htmlContent, pureContent } = data;
    let imageUploadable;
    //create new imageUploadable
    if (uploads && uploads.length > 0) {
      imageUploadable = await this.prisma.$transaction(async prisma => {
        const result = await prisma.imageUploadable.create({
          data: {
            account: { connect: { id: account.id } },
            uploads: {
              connect: uploads.map((upload: string) => {
                return { id: upload };
              })
            },
            type: ImageUploadableType.PRODUCT
          }
        });

        return result;
      });
    }

    let createFee: any;

    const savedProduct = await this.prisma.$transaction(async prisma => {
      let txid: string | undefined;
      if (data.createFeeHex) {
        const broadcastResponse = await this.chronik.broadcastTx(data.createFeeHex);
        if (!broadcastResponse) {
          throw new Error('Empty chronik broadcast response');
        }
        txid = broadcastResponse.txid;
      }

      const createdProduct = await prisma.post.create({
        data: {
          content: htmlContent,
          account: { connect: { id: account.id } },
          page: {
            connect: pageId ? { id: pageId } : undefined
          },
          commentable: {
            create: {
              type: CommentType.PRODUCT
            }
          },
          txid: txid,
          createFee: createFee,
          dana: {
            create: {}
          },
          taggable: {
            create: {}
          },
          type: PostType.PRODUCT,
          product: {
            create: {
              title,
              price,
              priceUnit,
              phoneNumber,
              description: htmlContent
            }
          }
        },
        include: {
          page: {
            select: {
              id: true,
              address: true,
              name: true
            }
          },
          token: {
            select: {
              id: true,
              name: true
            }
          },
          account: {
            select: {
              id: true,
              name: true,
              address: true
            }
          }
        }
      });

      return createdProduct;
    });

    let listAccountFollowerIds: number[] = [];
    // Notification
    if (pageId && savedProduct) {
      const page = await this.prisma.page.findFirst({
        where: {
          id: pageId
        }
      });

      if (!page) {
        const accountNotExistMessage = await this.i18n.t('page.messages.couldNotFindPage');
        throw new VError(accountNotExistMessage);
      }

      const recipient = await this.accountCacheService.getById(page.pageAccountId);
      if (!recipient) {
        const accountNotExistMessage = await this.i18n.t('account.messages.accountNotExist');
        throw new VError(accountNotExistMessage);
      }

      const createNotif = {
        senderId: account.id,
        recipientId: Number(page?.pageAccountId),
        notificationTypeId: NOTIFICATION_TYPES.POST_ON_PAGE,
        url: `/product/${savedProduct.id}`,
        additionalData: {
          senderName: account.name,
          senderAddress: account.address,
          senderAvatar: account.avatar,
          pageName: savedProduct?.page?.name
        }
      };
      const jobData = {
        notification: createNotif
      };
      createNotif.senderId !== createNotif.recipientId &&
        (await this.notificationService.saveAndDispatchNotification(jobData.notification));

      // collect account id follow page
      const followerPageIds = await this.followCacheService.getPageFollowers(page.id);
      if (followerPageIds && followerPageIds.length > 0) {
        const followerPageIdsMapped = followerPageIds.map(id => Number(id));
        listAccountFollowerIds = listAccountFollowerIds.concat(followerPageIdsMapped);
      }
    }
    // collect account id follow this account
    const followerAccountIds = await this.followCacheService.getAccountFollowers(account.id);
    if (followerAccountIds && followerAccountIds.length > 0) {
      const followerAccountIdsMapped = followerAccountIds.map(id => Number(id));
      listAccountFollowerIds = listAccountFollowerIds.concat(followerAccountIdsMapped);
    }
    if (listAccountFollowerIds && listAccountFollowerIds.length > 0) {
      // filter account duplicate
      listAccountFollowerIds = listAccountFollowerIds.filter(
        (value, index) => listAccountFollowerIds.indexOf(value) === index
      );
      // filter out main account of follower list
      listAccountFollowerIds = listAccountFollowerIds.filter(id => id !== account.id);
      const followerDetails = await this.prisma.account.findMany({
        where: { id: { in: listAccountFollowerIds } },
        select: { address: true }
      });
      if (followerDetails && followerDetails.length > 0) {
        const addressFollowerAccountDetails = followerDetails.map(item => item.address);
        const createNotiNewPost = {
          recipientAddresses: addressFollowerAccountDetails
        };
        await this.notificationService.saveAnddDispathNotificationNewPost(createNotiNewPost);
      }
    }

    // Fanout the post created
    return savedProduct;
  }

  @ResolveField('page', () => Page)
  async page(@Parent() product: Product) {
    return product?.pageId ? this.timelineableLoader.batchPages.load(product?.pageId) : null;
  }

  @ResolveField('danaViewScore', () => Number)
  async danaViewScore(@Parent() product: Product) {
    return this.timelineableLoader.batchDanaViewScores.load(product.id);
  }

  @ResolveField('followOwner', () => Boolean)
  async followOwner(@Parent() product: Product, @AccountEntity() account: Account) {
    const payload = {
      followingAccountId: product?.account?.id,
      accountId: account?.id
    };
    return this.timelineableLoader.batchCheckAccountFollowAllAccount.load(payload);
  }

  @ResolveField('followedPage', () => Boolean)
  async followedPage(@Parent() product: Product, @AccountEntity() account: Account) {
    const payload = {
      pageId: product?.page?.id || '',
      accountId: account?.id
    };
    return this.timelineableLoader.batchCheckAccountFollowAllPage.load(payload);
  }
}
