import { Injectable, Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Args, Resolver, Query, Float } from '@nestjs/graphql';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { GqlJwtAuthGuardByPass } from '../auth/guards/gql-jwtauth.guard';
import { AccountEntity } from 'src/decorators';
import { Account, COIN, ConvertDanaInput, DanaRate } from '@bcpros/lixi-models';
import { template } from 'src/utils/stringTemplate';
import { decode } from '@msgpack/msgpack';
import { KeyCurrentHeight } from './dana.constants';

@Injectable()
@Resolver()
@UseFilters(GqlHttpExceptionFilter)
export class ConvertDanaResolver {
  private logger: Logger = new Logger(ConvertDanaResolver.name);
  private keyHighestConvertData = 'items:convert-dana-highest:{{coin}}';

  constructor(@InjectRedis() private readonly redis: Redis) {}

  @Query(() => Float)
  @UseGuards(GqlJwtAuthGuardByPass)
  async convertDanaToCoin(@Args('ConvertDanaInput', { type: () => ConvertDanaInput }) data: ConvertDanaInput) {
    const { convertToCoin } = data;
    const keyHighestConvertRate = template(this.keyHighestConvertData, { coin: convertToCoin });

    //call highest info
    const danaRateBuff = await this.redis.hgetBuffer(keyHighestConvertRate, KeyCurrentHeight);
    if (!danaRateBuff) return 0;
    const danaRate = decode(danaRateBuff ?? '') as DanaRate;
    let coinPerDana = Math.round(danaRate?.coinPerDana ?? 0);

    if (convertToCoin === COIN.XRG) {
      const xrgPerDana = danaRate?.coinPerDana ?? 0;
      const mXrgPerDana = xrgPerDana * Math.pow(10, 6); // 1 Dana = 0.1mE
      coinPerDana = parseFloat(mXrgPerDana.toFixed(1));
    }

    return coinPerDana;
  }
}
