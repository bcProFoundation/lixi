import { Field, Float, ObjectType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

import { Post } from './post.model';

@ObjectType()
export class PostDana {
  @Field(() => Float)
  danaBurnUp: number;

  @Field(() => Float)
  danaBurnDown: number;

  @Field(() => Float)
  danaBurnScore: number;

  @IsOptional()
  @Field(() => String, { nullable: true })
  postId?: Nullable<string>;

  @IsOptional()
  @Field(() => Post, { nullable: true })
  post?: Nullable<Post>;
}
