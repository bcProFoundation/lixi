import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { PubSub } from 'graphql-subscriptions';
import { I18n, I18nService } from 'nestjs-i18n';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { PrismaService } from '../prisma/prisma.service';
import { Account, CreatePostPinInput, Pin, RemovePostPinInput } from '@bcpros/lixi-models';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwtauth.guard';
import { AccountEntity } from 'src/decorators';
import { PinType } from '@bcpros/lixi-prisma';

const pubSub = new PubSub();

@SkipThrottle()
@Resolver(() => Pin)
@UseFilters(GqlHttpExceptionFilter)
export class PinResolver {
  constructor(private logger: Logger, private prisma: PrismaService, @I18n() private i18n: I18nService) {}

  @Subscription(() => Pin)
  pinCreated() {
    return pubSub.asyncIterator('pinCreated');
  }

  @Query(() => Pin)
  async pin(@Args('id', { type: () => String }) id: string) {
    const result = await this.prisma.pin.findUnique({
      where: {
        id: id
      }
    });

    return result;
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Pin)
  async createPostPin(@AccountEntity() account: Account, @Args('data') data: CreatePostPinInput) {
    try {
      if (!account) {
        const couldNotFindAccount = await this.i18n.t('post.messages.couldNotFindAccount');
        throw new Error(couldNotFindAccount);
      }

      const { pageId, postId, accountId } = data;

      if (pageId) {
        const currentPage = await this.prisma.page.findUnique({
          where: { id: pageId },
          include: { pin: true, posts: true }
        });

        if (account.id === currentPage?.pageAccountId) {
          if (currentPage?.pin) {
            const currentPinable = await this.prisma.pinable.findUnique({
              where: { id: currentPage.pin?.pinableId || '' },
              include: { posts: true }
            });
            const previoutPost = currentPinable?.posts[0];

            //change pin of current post => new post
            const postPinned = await this.prisma.$transaction(async prisma => {
              await prisma.post.update({
                where: { id: previoutPost?.id },
                data: { pinable: { disconnect: true } }
              });
              await prisma.post.update({
                where: { id: postId },
                data: { pinable: { connect: { id: currentPinable?.id } } }
              });
            });

            return currentPage.pin;
          } else {
            const pin = await this.prisma.$transaction(async prisma => {
              const pinable = await prisma.pinable.create({
                data: { type: PinType.POST }
              });
              if (pinable) {
                await prisma.post.update({
                  where: { id: postId },
                  data: { pinable: { connect: { id: pinable.id } } }
                });

                const createdPin = await prisma.pin.create({
                  data: {
                    page: { connect: { id: pageId } },
                    pinable: { connect: { id: pinable.id } }
                  }
                });
                return createdPin;
              }
            });
            return pin;
          }
        }
      }

      if (accountId) {
        const currentAccount = await this.prisma.account.findUnique({
          where: { id: accountId },
          include: { pin: true, posts: true }
        });

        if (account.id === accountId) {
          if (currentAccount?.pin) {
            const currentPinable = await this.prisma.pinable.findUnique({
              where: { id: currentAccount.pin?.pinableId || '' },
              include: { posts: true }
            });
            const previoutPost = currentPinable?.posts[0];

            const postPinned = await this.prisma.$transaction(async prisma => {
              await prisma.post.update({
                where: { id: previoutPost?.id },
                data: { pinable: { disconnect: true } }
              });
              const updatePostPinned = await prisma.post.update({
                where: { id: postId },
                data: { pinable: { connect: { id: currentPinable?.id } } }
              });
            });
            return currentAccount.pin;
          } else {
            const pin = await this.prisma.$transaction(async prisma => {
              const pinable = await prisma.pinable.create({
                data: { type: PinType.POST }
              });
              if (pinable) {
                await prisma.post.update({
                  where: { id: postId },
                  data: { pinable: { connect: { id: pinable.id } } }
                });

                const createdPin = await prisma.pin.create({
                  data: {
                    account: { connect: { id: accountId } },
                    pinable: { connect: { id: pinable.id } }
                  }
                });
                return createdPin;
              }
            });
            return pin;
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Pin)
  async removePostPin(@AccountEntity() account: Account, @Args('data') data: RemovePostPinInput) {
    try {
      if (!account) {
        const couldNotFindAccount = await this.i18n.t('post.messages.couldNotFindAccount');
        throw new Error(couldNotFindAccount);
      }

      const { pageId, postId, accountId } = data;

      if (pageId) {
        const currentPage = await this.prisma.page.findUnique({
          where: { id: pageId },
          include: { pin: true, posts: true }
        });
        const currentPinId = currentPage?.pin?.id;
        const currentPinableId = currentPage?.pin?.pinableId;

        if (account.id === currentPage?.pageAccountId) {
          const removePin = await this.prisma.$transaction(async prisma => {
            const removePostPinned = await prisma.post.update({
              where: { id: postId },
              data: { pinable: { disconnect: true } }
            });
            const removePagePin = await prisma.page.update({
              where: { id: pageId },
              data: { pin: { disconnect: true } }
            });

            if (currentPinId && currentPinableId) {
              const removePin = await prisma.pin.delete({
                where: { id: currentPinId }
              });

              const removePinable = await prisma.pinable.delete({
                where: { id: currentPinableId }
              });
              return removePin;
            }
          });
          return removePin;
        }
      }

      if (accountId) {
        const currentAccount = await this.prisma.account.findUnique({
          where: { id: accountId },
          include: { pin: true, posts: true }
        });
        const currentPinId = currentAccount?.pin?.id;
        const currentPinableId = currentAccount?.pin?.pinableId;

        const removePin = await this.prisma.$transaction(async prisma => {
          const removePostPinned = await prisma.post.update({
            where: { id: postId },
            data: { pinable: { disconnect: true } }
          });
          const removeAccountPin = await prisma.account.update({
            where: { id: accountId },
            data: { pin: { disconnect: true } }
          });

          if (currentPinId && currentPinableId) {
            const removePin = await prisma.pin.delete({
              where: { id: currentPinId }
            });
            const removePinable = await prisma.pinable.delete({
              where: { id: currentPinableId }
            });
            return removePin;
          }
        });
        return removePin;
      }
    } catch (error) {
      console.log(error);
    }
  }
}
