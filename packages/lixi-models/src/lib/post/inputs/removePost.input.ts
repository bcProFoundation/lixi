import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemovePostInput {
  @Field(() => Number)
  accountId: number;

  @Field(() => String)
  postId: string;
}
