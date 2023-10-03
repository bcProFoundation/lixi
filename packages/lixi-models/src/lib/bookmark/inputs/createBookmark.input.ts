import { Field, InputType } from '@nestjs/graphql';

import { BookmarkType } from '../bookmark.model';

@InputType()
export class CreateBookmarkInput {
  @Field(() => String)
  bookmarkId: string;

  @Field(() => BookmarkType)
  bookmarkType: BookmarkType;
}
