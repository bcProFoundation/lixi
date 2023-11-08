import { createUnionType, Field, ID, ObjectType } from '@nestjs/graphql';

import { Event } from '../event';
import { Poll } from '../poll';
import { Post } from '../post';
import { Product } from '../product';

import { Comment } from './comment.model';

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

@ObjectType()
export class Commentable {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  type: string;

  @Field(() => [Comment])
  comments: Comment[];

  @Field(() => CommentTo)
  commentTo: typeof CommentTo;

  constructor(partial: Partial<Commentable>) {
    Object.assign(this, partial);
  }
}
