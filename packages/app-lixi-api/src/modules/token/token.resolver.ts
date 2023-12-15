import {
  Account,
  BasicPaginationArgs,
  CreateTokenInput,
  FollowOfType,
  IBasicPaginated,
  Token,
  TokenConnection,
  TokenDana
} from '@bcpros/lixi-models';
import { HttpException, HttpStatus, Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { ChronikClient } from 'chronik-client';
import moment from 'moment';
import { I18n, I18nContext, I18nService } from 'nestjs-i18n';
import { InjectChronikClient } from 'src/common/modules/chronik/chronik.decorators';
import { AccountEntity } from 'src/decorators';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { GqlJwtAuthGuard, GqlJwtAuthGuardByPass } from 'src/modules/auth/guards/gql-jwtauth.guard';
import VError from 'verror';
import { createEdge } from '../../common/custom-graphql-relay/paginate';
import { PrismaService } from '../prisma/prisma.service';
import { TokenCacheService } from './token-cache.service';
import { TokenTimelineCacheService } from './token-timeline-cache.service';
import TokenLoader from './token.loader';
import FollowScoreLoader from '../account/follow-score.loader';

@SkipThrottle()
@Resolver(() => Token)
@UseFilters(GqlHttpExceptionFilter)
export class TokenResolver {
  private logger: Logger = new Logger(this.constructor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenCacheService: TokenCacheService,
    private readonly tokenTimelineCacheService: TokenTimelineCacheService,
    private readonly tokenLoader: TokenLoader,
    private readonly followScoreLoader: FollowScoreLoader,
    @I18n() private readonly i18n: I18nService,
    @InjectChronikClient('xec') private chronik: ChronikClient
  ) {}

  @Query(() => Token)
  @UseGuards(GqlJwtAuthGuardByPass)
  async token(@AccountEntity() account: Account, @Args('id', { type: () => String }) id: string) {
    return this.tokenCacheService.getById(id);
  }

  @Query(() => Token)
  @UseGuards(GqlJwtAuthGuardByPass)
  async tokenByTokenId(@AccountEntity() account: Account, @Args('tokenId', { type: () => String }) tokenId: string) {
    return this.tokenCacheService.getByTokenId(tokenId);
  }

  @Query(() => TokenConnection)
  async allTokens(@Args() { after, first = 20 }: BasicPaginationArgs) {
    const paginated = await this.tokenTimelineCacheService.getPaginatedTokenTimeline(first, after);
    const tokenIds = paginated.edges.map(item => item.cursor);
    const tokens = await this.tokenCacheService.getByIds(tokenIds);
    return {
      ...paginated,
      edges: tokens.map(token => (token ? createEdge<Token>(token, 'id') : null))
    } as IBasicPaginated<Token>;
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Token)
  async createToken(@Args('data') data: CreateTokenInput, @I18n() i18n: I18nContext) {
    const { tokenId } = data;
    if (tokenId) {
      try {
        let token = await this.tokenCacheService.getByTokenId(tokenId);

        if (token) {
          throw new VError('Token already exist');
        }

        const tokenInfo = await this.chronik.token(tokenId);

        const tokenToInsert = {
          tokenId: tokenId,
          name: tokenInfo?.slpTxData?.genesisInfo?.tokenName,
          ticker: tokenInfo?.slpTxData?.genesisInfo?.tokenTicker,
          decimals: tokenInfo?.slpTxData?.genesisInfo?.decimals,
          initialTokenQuantity: tokenInfo?.initialTokenQuantity,
          tokenType: tokenInfo?.slpTxData?.slpMeta?.tokenType,
          tokenDocumentUrl: tokenInfo?.slpTxData?.genesisInfo?.tokenDocumentUrl,
          totalBurned: tokenInfo?.tokenStats?.totalBurned,
          totalMinted: tokenInfo?.tokenStats?.totalMinted,
          createdDate: moment(tokenInfo?.block?.timestamp, 'X').toDate(),
          comments: moment().toDate()
        };

        const createdToken = await this.prisma.token.create({
          data: {
            ...tokenToInsert,
            dana: {
              create: {}
            }
          }
        });

        token = await this.tokenCacheService.getById(createdToken.id);
        if (token) {
          await this.tokenTimelineCacheService.cacheToken(token);
        }

        return token;
      } catch (err) {
        if (err instanceof VError) {
          throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
        } else {
          const unableCreateToken = await i18n.t('token.messages.unableCreateToken');
          const error = new VError.WError(err as Error, unableCreateToken);
          throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }
    }
  }

  @ResolveField('followersCount', () => Number)
  async followersCount(@Parent() token: Token) {
    return this.tokenLoader.batchFollowersCount.load(token.id);
  }

  @ResolveField('dana', () => TokenDana)
  async dana(@Parent() token: Token) {
    return this.tokenLoader.batchTokenDanas.load(token.id);
  }

  @UseGuards(GqlJwtAuthGuardByPass)
  @ResolveField('isFollowed', () => Boolean)
  async isFollowed(@AccountEntity() account: Account, @Parent() token: Token) {
    if (!account) return false;
    return this.tokenLoader.batchIsFollowed.load({ accountId: account.id, tokenId: token.id });
  }

  @ResolveField('followScore', () => Number)
  async followScore(@Parent() token: Token) {
    const followOfType: FollowOfType = {
      tokenId: token.id
    };

    return this.followScoreLoader.batchTotalDanaFollowers.load(followOfType);
  }
}
