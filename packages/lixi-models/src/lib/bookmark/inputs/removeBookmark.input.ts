import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveBookmarkInput {
  @Field(() => String)
  bookmarkId: string;
}
