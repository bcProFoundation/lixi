import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveBookmarkInput {
  @Field(() => Number)
  accountId: number;

  @Field(() => String)
  bookmarkForId: string;
}
