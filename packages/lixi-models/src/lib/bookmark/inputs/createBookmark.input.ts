import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateBookmarkInput {
  @Field(() => Number)
  accountId: number;

  @Field(() => String)
  bookmarkForId: string;
}
