import { Field, Float, ObjectType } from '@nestjs/graphql';

import { Post } from './post.model';

@ObjectType()
export class PostBoost {
  @Field(() => Float)
  boostUp: number;

  @Field(() => Float)
  boostDown: number;

  @Field(() => Float)
  boostScore: number;

  @Field(() => Float)
  boostReceivedUp: number;

  @Field(() => Float)
  boostReceivedDown: number;

  @Field(() => Float)
  boostReceivedScore: number;

  @Field(() => Number)
  version: number;

  @Field(() => String)
  postId: string;

  @Field(() => Post)
  post: Post;

  constructor(partial: Partial<PostBoost>) {
    this.boostReceivedUp = 0;
    this.boostReceivedDown = 0;
    this.boostReceivedScore = 0;
    this.boostUp = 0;
    this.boostDown = 0;
    this.boostScore = 0;
    this.version = 0;
    Object.assign(this, partial);
  }
}
