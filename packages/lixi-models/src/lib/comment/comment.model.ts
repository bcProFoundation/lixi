import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { GraphQLDateTime } from 'graphql-scalars';

import { Account } from '../account';
import { ImageUploadable } from '../imageUploadable';

import { CommentDana } from './comment-dana.model';
import { Commentable } from './commentable.model';

@ObjectType()
export class Comment {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  content: string;

  @IsOptional()
  @Field(() => Number, { nullable: true })
  commentAccountId?: Nullable<number>;

  @IsOptional()
  @Field(() => Account, { nullable: true })
  commentAccount?: Nullable<Account>;

  @IsOptional()
  @Field(() => String, { nullable: true })
  commentByPublicKey?: Nullable<string>;

  @Field(() => String, { nullable: true })
  commentableId?: Nullable<string>;

  @Field(() => Commentable, { nullable: true })
  commentable?: Nullable<Commentable>;

  @Field(() => String)
  commentText: string;

  @Field(() => Float)
  danaBurnUp: number;

  @Field(() => Float)
  danaBurnDown: number;

  @Field(() => Float)
  danaBurnScore: number;

  @IsOptional()
  @Field(() => CommentDana, { nullable: true })
  commentDana?: Nullable<CommentDana>;

  @Field(() => ImageUploadable, { nullable: true })
  imageUploadable?: Nullable<ImageUploadable>;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was created.'
  })
  createdAt: Date;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was last updated.'
  })
  updatedAt: Date;

  constructor(partial: Partial<Comment>) {
    Object.assign(this, partial);
  }
}
