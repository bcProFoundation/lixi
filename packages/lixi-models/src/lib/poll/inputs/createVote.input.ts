import { Field, InputType } from '@nestjs/graphql';

import { Nullable } from '../../nullable';

@InputType()
export class CreateVoteInput {
  @Field(() => String)
  pollId: string;

  @Field(() => Number)
  accountId: number;

  @Field(() => String)
  optionId: string;

  @Field(() => [String], { nullable: true })
  previousOptionIds?: Nullable<string[]>;

  @Field(() => Boolean)
  singleSelect: boolean;
}
