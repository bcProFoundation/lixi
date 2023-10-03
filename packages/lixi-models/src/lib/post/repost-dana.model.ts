import { Field, Float, ObjectType } from '@nestjs/graphql';

import { Repost } from './repost.model';

@ObjectType()
export class PostDana {
  @Field(() => Float)
  danaBurnUp: number;

  @Field(() => Float)
  danaBurnDown: number;

  @Field(() => Float)
  danaBurnScore: number;

  @Field(() => Number)
  version: number;

  @Field(() => String)
  repostId: string;

  @Field(() => Repost)
  repost: Repost;
}
