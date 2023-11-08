import { Field, Float, ObjectType } from '@nestjs/graphql';

import { Poll } from './poll.model';

@ObjectType()
export class PollDana {
  @Field(() => Float)
  danaBurnUp: number;

  @Field(() => Float)
  danaBurnDown: number;

  @Field(() => Float)
  danaBurnScore: number;

  @Field(() => Float)
  danaReceivedUp: number;

  @Field(() => Float)
  danaReceivedDown: number;

  @Field(() => Float)
  danaReceivedScore: number;

  @Field(() => Number)
  version: number;

  @Field(() => String)
  pollId: string;

  @Field(() => Poll)
  poll: Poll;

  constructor(partial: Partial<PollDana>) {
    Object.assign(this, partial);
  }
}
