import { Field, Float, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PollOption {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  pollId: string;

  @Field(() => String)
  option: string;

  @Field(() => Float, { nullable: true })
  danaPoint?: number;

  constructor(partial: Partial<PollOption>) {
    Object.assign(this, partial);
  }
}
