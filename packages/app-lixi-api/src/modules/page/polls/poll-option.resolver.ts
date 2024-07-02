import { PollOption } from '@bcpros/lixi-models';
import { Injectable, UseFilters } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { GqlHttpExceptionFilter } from 'src/middlewares/gql.exception.filter';
import { PrismaService } from '../../prisma/prisma.service';
import PollLoader from './poll.loader';

@Injectable()
@Resolver(() => PollOption)
@UseFilters(GqlHttpExceptionFilter)
export class PollOptionResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pollLoader: PollLoader
  ) {}

  @ResolveField('danaScoreOption', () => Number)
  async danaScoreOption(@Parent() pollOption: PollOption) {
    return this.pollLoader.batchDanaScoreOption.load(pollOption.id);
  }
}
