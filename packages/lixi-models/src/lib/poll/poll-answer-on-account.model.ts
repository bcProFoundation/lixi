import { Field, Float, ObjectType } from '@nestjs/graphql';

import { Account } from '../account';

@ObjectType()
export class PollAnswerOnAccount {
  @Field(() => Account, { nullable: true })
  account?: Nullable<Account>;

  @Field(() => Number)
  accountId: number;

  @Field(() => Float)
  pollDanaScore: number;

  constructor(partial: Partial<PollAnswerOnAccount>) {
    Object.assign(this, partial);
  }
}
