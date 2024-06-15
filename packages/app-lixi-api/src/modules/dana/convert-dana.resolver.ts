import { Injectable, Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Int, Resolver, Query } from '@nestjs/graphql';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { ChronikClient } from 'chronik-client';
import Redis from 'ioredis';
import { InjectChronikClient } from 'nestjs-chronik';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { GqlJwtAuthGuardByPass } from '../auth/guards/gql-jwtauth.guard';
import { AccountEntity } from 'src/decorators';
import { Account, COIN, ConvertDanaInput, DanaRate } from '@bcpros/lixi-models';
import { template } from 'src/utils/stringTemplate';
import { decode, encode } from '@msgpack/msgpack';
import { KeyCurrentHeight } from './dana.constants';

@Injectable()
@Resolver()
@UseFilters(GqlHttpExceptionFilter)
export class ConvertDanaResolver {
  private logger: Logger = new Logger(ConvertDanaResolver.name);
  private keyHighestConvertData = 'items:convert-dana-highest:{{coin}}';

  constructor(@InjectRedis() private readonly redis: Redis) {}

  @Query(() => Number)
  @UseGuards(GqlJwtAuthGuardByPass)
  async convertDanaToCoin(
    @AccountEntity() account: Account,
    @Args('ConvertDanaInput', { type: () => ConvertDanaInput }) data: ConvertDanaInput
  ) {
    if (!account) {
      return 0;
    }
    const { convertToCoin, quantity } = data;
    const keyHighestConvertRate = template(this.keyHighestConvertData, { coin: convertToCoin });

    //call highest info
    const danaRateBuff = await this.redis.hgetBuffer(keyHighestConvertRate, KeyCurrentHeight);
    const danaRate = decode(danaRateBuff ?? '') as DanaRate;
    const coinPerDana = Math.round(danaRate?.coinPerDana ?? 0);
    return coinPerDana * quantity;
  }
}
