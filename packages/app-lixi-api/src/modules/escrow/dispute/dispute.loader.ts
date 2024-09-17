import { EscrowOrder } from '@bcpros/lixi-models';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { Redis } from 'ioredis';
import _ from 'lodash';
import { PrismaService } from '../../prisma/prisma.service';
import { EscrowOrderCacheService } from '../escrow-order/escrow-order-cache.service';

@Injectable({ scope: Scope.REQUEST })
export default class DisputeLoader {
  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
    private readonly escrowOrderCacheService: EscrowOrderCacheService
  ) {}

  public readonly batchEscrowOrders = new DataLoader(async (escrowOrders: readonly string[]) => {
    const ids = (escrowOrders as unknown as string[]) ?? [];
    const disputes = await this.escrowOrderCacheService.getByIds(ids);
    const data = escrowOrders.map((escrowOrderId, index) => {
      return disputes[index] ?? new EscrowOrder({ id: escrowOrderId });
    });
    return Promise.resolve(data);
  });
}
