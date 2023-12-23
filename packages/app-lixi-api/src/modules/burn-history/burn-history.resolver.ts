import { Account, BasicPaginationArgs, BurnBasicConnection, BurnItem, IBasicPaginated } from '@bcpros/lixi-models';
import { Logger, UseFilters } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { createEdge } from 'src/common/custom-graphql-relay/paginate';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { BurnHistoryCacheService } from './burn-history-cache.service';
import PostLoader from '../page/post.loader';

@SkipThrottle()
@Resolver(() => BurnItem)
@UseFilters(GqlHttpExceptionFilter)
export class BurnHistoryResolver {
  constructor(
    private logger: Logger,
    private burnHistoryCacheService: BurnHistoryCacheService,
    private postLoader: PostLoader
  ) {}

  @Query(() => BurnBasicConnection)
  async postBurnHistory(@Args('id', { type: () => String }) id: string, @Args() { after, first }: BasicPaginationArgs) {
    if (!id) return;

    const paginated = await this.burnHistoryCacheService.getPaginatedPostBurnTimeline(id, first, after);
    const burnIds = paginated.edges.map(item => item.cursor);
    const burns = await this.burnHistoryCacheService.getByIds(burnIds);
    return {
      ...paginated,
      edges: burns.map(burn => (burn ? createEdge<BurnItem>(burn, 'id') : null))
    } as IBasicPaginated<BurnItem>;
  }

  @ResolveField('burnedBy', () => Account)
  async postAccount(@Parent() burn: BurnItem) {
    return this.postLoader.batchAccountsByAddressHash160.load(burn.burnedBy);
  }
}
