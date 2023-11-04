import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Balances {
  @Field(() => String)
  totalBalanceInSatoshis: string;

  @Field(() => String)
  totalBalance: string;
}
