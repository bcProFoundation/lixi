import { Account, Offer } from '@bcpros/lixi-models';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountCacheService } from '../../account/account-cache.service';
import { OfferCacheService } from '../offer/offer-cache.service';

@Injectable({ scope: Scope.REQUEST })
export default class EscrowOrderLoader {
  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
    private readonly accountCacheService: AccountCacheService,
    private readonly offerCacheService: OfferCacheService
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

  public readonly batchPaymentMethods = new DataLoader(async (ids: readonly number[]) => {
    const paymentMethodIds = ids as unknown as number[];
    const paymentMethods = await this.prisma.paymentMethod.findMany({
      where: {
        id: { in: paymentMethodIds }
      }
    });

    const mapResult = new Map(
      paymentMethods.map(paymentMethod => {
        return [paymentMethod.id, paymentMethod];
      })
    );

    const data = paymentMethodIds.map((id, index) => {
      return mapResult.get(id) ?? '';
    });
    return Promise.resolve(data);
  });

  public readonly batchAccounts = new DataLoader(async (accountIds: readonly number[]) => {
    const ids = (accountIds as unknown as number[]) ?? [];
    const accounts = await this.accountCacheService.getByIds(ids);
    const data = accountIds.map((accountId, index) => {
      return accounts[index] ?? new Account({ id: accountId });
    });
    return Promise.resolve(data);
  });

  public readonly batchOffers = new DataLoader(async (offerIds: readonly string[]) => {
    const ids = (offerIds as unknown as string[]) ?? [];
    const offers = await this.offerCacheService.getByIds(ids);
    const data = offerIds.map((offerId, index) => {
      return offers[index] ?? new Offer({ postId: offerId });
    });
    return Promise.resolve(data);
  });
}
