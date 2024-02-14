import { Field, ID, ObjectType } from '@nestjs/graphql';

import { PollAnswerOnAccount } from './poll-answer-on-account.model';

@ObjectType()
export class PollOption {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  pollId: string;

  @Field(() => String)
  option: string;

  @Field(() => Number, { nullable: true })
  danaScoreOption?: Nullable<number>;

  @Field(() => [PollAnswerOnAccount], { nullable: true })
  pollAnswerOnAccount?: Nullable<PollAnswerOnAccount[]>;

  constructor(partial: Partial<PollOption>) {
    Object.assign(this, partial);
  }
}
