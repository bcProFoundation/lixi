import { Account, ITimelineable, PostBoost, PostDana, Repost } from '@bcpros/lixi-models';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../prisma/prisma.service';

@Injectable({ scope: Scope.REQUEST })
export default class OfferLoader {
  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis
  ) {}

  public readonly batchCountries = new DataLoader(async (ids: readonly number[]) => {
    const countryIds = ids as unknown as number[];
    const countries = await this.prisma.country.findMany({
      where: {
        id: { in: countryIds }
      }
    });

    const mapResult = new Map(
      countries.map(country => {
        return [country.id, country];
      })
    );

    const data = countryIds.map((id, index) => {
      return mapResult.get(id) ?? '';
    });
    return Promise.resolve(data);
  });

  public readonly batchStates = new DataLoader(async (ids: readonly number[]) => {
    const stateIds = ids as unknown as number[];
    const states = await this.prisma.state.findMany({
      where: {
        id: { in: stateIds }
      }
    });

    const mapResult = new Map(
      states.map(state => {
        return [state.id, state];
      })
    );

    const data = stateIds.map((id, index) => {
      return mapResult.get(id) ?? '';
    });
    return Promise.resolve(data);
  });
}
