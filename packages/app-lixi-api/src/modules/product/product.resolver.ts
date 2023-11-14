import {
  Account,
  CreateProductInput,
  DeleteProductInput,
  Page,
  PaginationArgs,
  Product,
  ProductConnection,
  ProductOrder,
  UpdateProductInput
} from '@bcpros/lixi-models';
import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';
import { HttpException, HttpStatus, Injectable, Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver, Subscription } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { I18n, I18nService } from 'nestjs-i18n';
import { PageAccountEntity } from 'src/decorators';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import VError from 'verror';
import { GqlJwtAuthGuard } from '../auth/guards/gql-jwtauth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@bcpros/lixi-prisma';

const pubSub = new PubSub();

@Injectable()
@Resolver(() => Product)
@UseFilters(GqlHttpExceptionFilter)
export class ProductResolver {
  constructor(private logger: Logger, private prisma: PrismaService, @I18n() private i18n: I18nService) {}

  @Query(() => Product)
  async product(@Args('id', { type: () => String }) id: string) {
    const result = await this.prisma.product.findUnique({
      where: { id: id },
      include: { page: true }
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

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Product)
  async createProduct(@PageAccountEntity() account: Account, @Args('data') data: CreateProductInput) {
    if (!account) {
      const couldNotFindAccount = await this.i18n.t('page.messages.couldNotFindAccount');
      const error = new VError.WError(couldNotFindAccount);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // const productToSave: Prisma.ProductCreateInput = {
    //   title: data.title,
    //   price: data.price,
    //   priceUnit: data.priceUnit,
    //   phoneNumber: data.phoneNumber,
    //   description: data.description,
    //   page: { connect: { id: data.pageId } },
    //   category: {
    //     connect: {
    //       id: Number(data.categoryId)
    //     }
    //   },
    //   imageUploadable: {
    //     create: {}
    //   }
    // };
    // const createdProduct = await this.prisma.$transaction(async prisma => {
    //   const product = await prisma.product.create({
    //     data: {
    //       ...productToSave
    //     }
    //   });
    //   await prisma.upload.updateMany({
    //     where: {
    //       id: {
    //         in: data.uploadImages
    //       }
    //     },
    //     data: {
    //       imageUploadableId: product.imageUploadableId
    //     }
    //   });
    //   return product;
    // });

    // return createdProduct;
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
    result = await findManyCursorConnection(
      args =>
        this.prisma.product.findMany({
          include: { page: true },
          where: {
            OR: [
              {
                AND: [{ pageId: id }]
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
              }
            ]
          }
        }),
      { first, last, before, after }
    );
    console.log('result products', result);
    return result;
  }

  @ResolveField('page', () => Page)
  async page(@Parent() product: Product) {
    const page = this.prisma.page.findFirst({
      where: {
        id: product.page.id
      }
    });
    return page;
  }
}
