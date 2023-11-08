import { Field, Float, ObjectType } from '@nestjs/graphql';

import { Comment } from './comment.model';

@ObjectType()
export class CommentDana {
  @Field(() => Float)
  danaBurnUp: number;

  @Field(() => Float)
  danaBurnDown: number;

  @Field(() => Float)
  danaBurnScore: number;

  @Field(() => Number)
  version: number;

  @Field(() => String)
  commentId: string;

  @Field(() => Comment)
  comment: Comment;

  constructor(partial: Partial<CommentDana>) {
    Object.assign(this, partial);
  }
}
