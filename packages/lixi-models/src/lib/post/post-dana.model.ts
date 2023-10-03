import { Field, Float, ObjectType } from '@nestjs/graphql';

import { Post } from './post.model';

@ObjectType()
export class PostDana {
  @Field(() => Float)
  danaBurnUp: number;

  @Field(() => Float)
  danaBurnDown: number;

  @Field(() => Float)
  danaBurnScore: number;

  @Field(() => Float)
  danaReceivedUp: number;

  @Field(() => Float)
  danaReceivedDown: number;

  @Field(() => Float)
  danaReceivedScore: number;

  @Field(() => Number)
  version: number;

  @Field(() => String)
  postId: string;

  @Field(() => Post)
  post: Post;
}
