import {
  Product,
  PaginationArgs,
  PageOrder,
  ProductConnection,
  Account,
  CreateProductInput,
  UpdateProductInput,
  DeleteProductInput,
  ProductOrder
} from '@bcpros/lixi-models';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { HttpException, HttpStatus, Injectable, Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver, Subscription } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { PrismaService } from '../prisma/prisma.service';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwtauth.guard';
import { I18n, I18nService } from 'nestjs-i18n';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { PageAccountEntity } from 'src/decorators';
import VError from 'verror';
import _ from 'lodash';

const pubSub = new PubSub();

@Injectable()
@Resolver(() => Product)
@UseFilters(GqlHttpExceptionFilter)
export class ProductResolver {
  constructor(private logger: Logger, private prisma: PrismaService, @I18n() private i18n: I18nService) {}

  @Subscription(() => Product)
  productCreated() {
    return pubSub.asyncIterator('productCreated');
  }

  @Query(() => Product)
  async product(@Args('id', { type: () => String }) id: string) {
    const result = await this.prisma.product.findUnique({
      where: { id: id },
      include: { page: true, productImages: true }
    });
    return result;
  }

  @Query(() => ProductConnection)
  async allProducts(
    @Args() { after, before, first, last }: PaginationArgs,
    @Args({ name: 'query', type: () => String, nullable: true })
    query: string,
    @Args({
      name: 'orderBy',
      type: () => ProductOrder,
      nullable: true
    })
    orderBy: ProductOrder
  ) {
    const result = await findManyCursorConnection(
      async args => {
        const products = await this.prisma.product.findMany({
          orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
          ...args
        });

        const output = products.map(product => ({
          ...product
        }));
        return output;
      },
      () => this.prisma.product.count(),
      { first, last, before, after }
    );
    return result;
  }

  @ResolveField()
  async productImages(@Parent() product: Product) {
    const productImages = this.prisma.uploadDetail.findMany({
      where: {
        productId: product.id
      },
      include: {
        upload: {
          select: {
            id: true,
            sha: true,
            bucket: true,
            width: true,
            height: true,
            sha800: true,
            sha320: true,
            sha40: true
          }
        }
      }
    });
    return productImages;
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Product)
  async createProduct(@PageAccountEntity() account: Account, @Args('data') data: CreateProductInput) {
    if (!account) {
      const couldNotFindAccount = await this.i18n.t('page.messages.couldNotFindAccount');
      const error = new VError.WError(couldNotFindAccount);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    let uploadDetailIds: any[] = [];
    const promises = data.uploadImages.map(async (id: string) => {
      const uploadDetails = await this.prisma.uploadDetail.findFirst({
        where: {
          uploadId: id
        }
      });

      return uploadDetails && uploadDetails.id;
    });
    uploadDetailIds = await Promise.all(promises);
    const productToSave = {
      data: {
        name: data.name,
        title: data.title,
        price: data.price,
        priceUnit: data.priceUnit,
        phoneNumber: data.phoneNumber,
        description: data.description,
        page: { connect: { id: data.pageId } },
        category: {
          connect: {
            id: Number(data.categoryId)
          }
        },
        productImages: {
          connect:
            uploadDetailIds.length > 0
              ? uploadDetailIds.map((uploadDetail: any) => {
                  return {
                    id: uploadDetail
                  };
                })
              : undefined
        }
      }
    };
    const createdProduct = await this.prisma.product.create({
      ...productToSave,
      include: { page: true }
    });

    return createdProduct;
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Product)
  async updateProduct(@PageAccountEntity() account: Account, @Args('data') data: UpdateProductInput) {
    if (!account) {
      const couldNotFindAccount = await this.i18n.t('page.messages.couldNotFindAccount');
      throw new VError.WError(couldNotFindAccount);
    }
    const uploadDetailIds = data.uploadImages || [];
    const productToUpdate = {
      data: {
        name: data.name,
        title: data.title,
        price: data.price,
        priceUnit: data.priceUnit,
        phoneNumber: data.phoneNumber,
        description: data.description,
        page: { connect: { id: data.pageId } },
        category: {
          connect: {
            id: data.categoryId
          }
        },
        productImages: {
          connect:
            uploadDetailIds.length > 0
              ? uploadDetailIds.map((uploadDetail: any) => {
                  return {
                    id: uploadDetail
                  };
                })
              : undefined
        }
      }
    };
    const updatedProduct = await this.prisma.product.update({
      where: {
        id: data.id
      },
      ...productToUpdate,
      include: { page: true }
    });

    return updatedProduct;
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Product)
  async deleteProduct(@PageAccountEntity() account: Account, @Args('data') data: DeleteProductInput) {
    if (!account) {
      const couldNotFindAccount = await this.i18n.t('page.messages.couldNotFindAccount');
      throw new VError.WError(couldNotFindAccount);
    }
    let uploadDetailIds: any[] = [];
    const promises = data.uploadImages.map(async (id: string) => {
      const uploadDetails = await this.prisma.uploadDetail.findFirst({
        where: {
          uploadId: id
        }
      });

      return uploadDetails && uploadDetails.id;
    });
    uploadDetailIds = await Promise.all(promises);
    await this.prisma.$transaction(async prisma => {
      const deleteUploadDetails = await this.prisma.uploadDetail.deleteMany({
        where: {
          id: {
            in: uploadDetailIds
          }
        }
      });

      const deleteUpload = await this.prisma.upload.deleteMany({
        where: {
          id: {
            in: data.uploadImages
          }
        }
      });
    });

    const deleteProduct = await this.prisma.product.delete({
      where: {
        id: data.id
      },
      include: { page: true }
    });

    return deleteProduct;
  }

  @Query(() => ProductConnection)
  @UseGuards(GqlJwtAuthGuard)
  async allProductsByPageId(
    @Args() { after, before, first, last, minBurnFilter }: PaginationArgs,
    @Args({ name: 'id', type: () => String, nullable: true })
    id: string,
    @Args({
      name: 'orderBy',
      type: () => ProductOrder,
      nullable: true
    })
    orderBy: ProductOrder
  ) {
    let result;
    // const page = await this.prisma.page.findUnique({
    //   where: {
    //     id: id
    //   }
    // });
    result = await findManyCursorConnection(
      args =>
        this.prisma.product.findMany({
          include: { page: true },
          where: {
            OR: [
              {
                AND: [{ pageId: id }]
              },
              {
                AND: [{ pageId: id }, { lotusBurnScore: { gte: minBurnFilter ?? 0 } }]
              }
            ]
          },
          orderBy: orderBy ? { [orderBy.field]: orderBy.direction } : undefined,
          ...args
        }),
      () =>
        this.prisma.product.count({
          where: {
            OR: [
              {
                AND: [{ pageId: id }]
              },
              {
                AND: [{ pageId: id }, { lotusBurnScore: { gte: minBurnFilter ?? 0 } }]
              }
            ]
          }
        }),
      { first, last, before, after }
    );
    console.log('result products', result);
    return result;
  }

  @ResolveField()
  async page(@Parent() product: Product) {
    const page = this.prisma.page.findFirst({
      where: {
        id: product.page.id
      }
    });
    return page;
  }

  // @UseGuards(GqlJwtAuthGuard)
  // @Mutation(() => Page)
  // async updatePage(@PageAccountEntity() account: Account, @Args('data') data: UpdatePageInput) {
  //   if (!account) {
  //     const couldNotFindAccount = await this.i18n.t('page.messages.couldNotFindAccount');
  //     throw new VError.WError(couldNotFindAccount);
  //   }

  //   const uploadAvatarDetail = data.avatar
  //     ? await this.prisma.uploadDetail.findFirst({
  //         where: {
  //           uploadId: data.avatar
  //         }
  //       })
  //     : undefined;

  //   const uploadCoverDetail = data.cover
  //     ? await this.prisma.uploadDetail.findFirst({
  //         where: {
  //           uploadId: data.cover
  //         }
  //       })
  //     : undefined;

  //   const updatedPage = await this.prisma.page.update({
  //     where: {
  //       id: data.id
  //     },
  //     data: {
  //       ..._.omit(data, ['categoryId', 'countryId', 'stateId', 'parentId', 'avatar', 'cover']),
  //       avatar: { connect: uploadAvatarDetail ? { id: uploadAvatarDetail.id } : undefined },
  //       cover: { connect: uploadCoverDetail ? { id: uploadCoverDetail.id } : undefined },
  //       category: {
  //         connect: data.categoryId
  //           ? {
  //               id: Number(data.categoryId)
  //             }
  //           : undefined
  //       },
  //       country: {
  //         connect: data.countryId
  //           ? {
  //               id: Number(data.countryId)
  //             }
  //           : undefined
  //       },
  //       state: {
  //         connect: data.stateId
  //           ? {
  //               id: Number(data.stateId)
  //             }
  //           : undefined
  //       }
  //     }
  //   });

  //   pubSub.publish('pageUpdated', { pageUpdated: updatedPage });
  //   return updatedPage;
  // }
}
