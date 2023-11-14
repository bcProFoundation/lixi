import { createUnionType, Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';

import { Event } from '../event';
import { Poll } from '../poll';
import { Post } from '../post';
import { Product } from '../product';

export const CommentTo = createUnionType({
  name: 'CommentTo',
  types: () => [Post, Poll, Event, Product],
  resolveType(value) {
    switch (value.constructor.name) {
      case 'Post':
        return Post;
      case 'Event':
        return Event;
      case 'Poll':
        return Poll;
      case 'Product':
        return Product;
      default:
        return Post;
    }
  }
});

export interface ICommentableTo {
  id: string;
  commentableId?: Nullable<string>;
}

export enum CommentType {
  POST = 'POST',
  EVENT = 'EVENT',
  POLL = 'POLL',
  PRODUCT = 'PRODUCT'
}

registerEnumType(CommentType, {
  name: 'CommentType',
  description: 'The type comment attach to'
});

@ObjectType()
export class Commentable {
  @Field(() => ID)
  id: string;

  @Field(() => CommentType)
  type: CommentType;

  @Field(() => String)
  commentToId: string;

  constructor(partial: Partial<Commentable>) {
    Object.assign(this, partial);
  }
}
