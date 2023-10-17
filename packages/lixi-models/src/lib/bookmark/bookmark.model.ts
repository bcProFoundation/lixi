import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { GraphQLDateTime } from 'graphql-scalars';

import { Account } from '../account';

@ObjectType()
export class Bookmark {
  @Field(() => ID)
  id: string;

  @Field(() => Account)
  account: Account;

  @Field(() => String)
  bookmarkId: string;

  @Field(() => BookmarkType, { nullable: true })
  type?: BookmarkType;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was created.',
    nullable: true
  })
  createdAt?: Date;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was last updated.',
    nullable: true
  })
  updatedAt?: Date;
}

export enum BookmarkType {
  POST = 'POST',
  COMMENT = 'COMMENT'
}

registerEnumType(BookmarkType, {
  name: 'BookmarkType',
  description: 'The type of bookmark.'
});
