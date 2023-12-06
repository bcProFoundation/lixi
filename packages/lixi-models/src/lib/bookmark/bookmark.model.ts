import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { GraphQLDateTime } from 'graphql-scalars';

import { Account } from '../account';

@ObjectType()
export class Bookmark {
  @Field(() => ID)
  id: string;

  @Field(() => Number)
  accountId: number;

  @Field(() => Account)
  account: Account;

  @Field(() => String)
  bookmarkableId: string;

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

  constructor(partial: Partial<Bookmark>) {
    Object.assign(this, partial);
  }
}

export enum BookmarkType {
  POST = 'POST',
  POLL = 'POLL',
  EVENT = 'EVENT',
  PRODUCT = 'PRODUCT',
  COMMENT = 'COMMENT'
}

registerEnumType(BookmarkType, {
  name: 'BookmarkType',
  description: 'The type of bookmark.'
});

@ObjectType()
export class Bookmarkable {
  @Field(() => ID)
  id: string;

  @Field(() => BookmarkType)
  type: BookmarkType;
}
