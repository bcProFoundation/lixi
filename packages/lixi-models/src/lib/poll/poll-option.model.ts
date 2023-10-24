import { Field, Float, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PollOption {
  @Field(() => ID)
  id: string;

  @Field(() => Number)
  pollId: number;

  @Field(() => String)
  option: string;

  @Field(() => Float)
  danaPoint: number;

  constructor(partial: Partial<PollOption>) {
    Object.assign(this, partial);
  }
}
