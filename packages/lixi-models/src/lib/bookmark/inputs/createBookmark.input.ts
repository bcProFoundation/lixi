import { Field, InputType } from '@nestjs/graphql';

import { BookmarkType } from '../bookmark.model';

@InputType()
export class CreateBookmarkInput {
  @Field(() => Number)
  accountId: number;

  @Field(() => String)
  bookmarkForId: string;

  @Field(() => BookmarkType)
  bookmarkType: BookmarkType;
}
