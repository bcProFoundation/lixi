import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AccountStatsOrder {
  @Field(() => Float)
  donationAmount: number;

  @Field(() => Number)
  completedOrder: number;

  @Field(() => Number)
  uniqueTrades: number;
}
