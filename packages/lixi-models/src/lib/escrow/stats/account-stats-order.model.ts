import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AccountStatsOrder {
  @Field(() => Float)
  donationAmount: number;

  @Field(() => Number)
  totalOrder: number;

  @Field(() => Number)
  completedOrder: number;

  @Field(() => Float)
  completionRate: number;
}
