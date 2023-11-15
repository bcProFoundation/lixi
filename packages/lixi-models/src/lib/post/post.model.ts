import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { GraphQLDateTime } from 'graphql-scalars';

import { Account } from '../account';
import { ICommentableTo } from '../comment';
import { PostHashtag } from '../hashtag/postHashtag.model';
import { ImageUploadable } from '../imageUploadable';
import { Page } from '../page';
import { Token } from '../token';
import { UploadDetail } from '../upload';

import { PostDana } from './post-dana.model';
import { Repost } from './repost.model';

@ObjectType()
export class Post implements ICommentableTo {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  content: string;

  @Field(() => Number)
  postAccountId: number;

  @Field(() => Account)
  postAccount: Account;

  @Field(() => String, { nullable: true })
  tokenId?: Nullable<string>;

  @Field(() => Token, { nullable: true })
  token?: Nullable<Token>;

  @Field(() => [UploadDetail], { nullable: true })
  uploads: Nullable<UploadDetail[]>;

  @Field(() => Page, { nullable: true })
  page?: Nullable<Page>;

  @IsOptional()
  @Field(() => String, { nullable: true })
  pageId?: Nullable<string>;

  @Field(() => Float)
  danaBurnUp: number;

  @Field(() => Float)
  danaBurnDown: number;

  @Field(() => Float)
  danaBurnScore: number;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was created.'
  })
  createdAt: Date;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was last updated.'
  })
  updatedAt: Date;

  @Field(() => Number)
  totalComments: number;

  @Field(() => [PostHashtag], { nullable: true })
  postHashtags?: Nullable<PostHashtag[]>;

  @Field(() => Boolean, { nullable: true })
  followPostOwner?: Nullable<boolean>;

  @Field(() => Boolean, { nullable: true })
  followedPage?: Nullable<boolean>;

  @Field(() => Boolean, { nullable: true })
  followedToken?: Nullable<boolean>;

  @Field(() => Number)
  repostCount: number;

  @Field(() => [Repost], { nullable: true })
  reposts?: Nullable<Repost[]>;

  @Field(() => String, { nullable: true })
  originalLanguage?: Nullable<string>;

  @Field(() => [PostTranslation], { nullable: true })
  translations?: Nullable<PostTranslation[]>;

  @Field(() => String, { nullable: true })
  commentableId?: Nullable<string>;

  @Field(() => String, { nullable: true })
  bookmarkableId?: Nullable<string>;

  @Field(() => String, { nullable: true })
  taggableId?: Nullable<string>;

  @Field(() => String, { nullable: true })
  pinableId?: Nullable<string>;

  @Field(() => Boolean, { nullable: true })
  pinned?: Nullable<boolean>;

  @Field(() => Float, { nullable: true })
  danaViewScore?: Nullable<number>;

  @Field(() => ImageUploadable, { nullable: true })
  imageUploadable?: Nullable<ImageUploadable>;

  @IsOptional()
  @Field(() => PostDana, { nullable: true })
  postDana?: Nullable<PostDana>;

  constructor(partial: Partial<Post>) {
    Object.assign(this, partial);
  }
}

@ObjectType()
export class PostTranslation {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  translateContent?: Nullable<string>;

  @Field(() => String, { nullable: true })
  translateLanguage?: Nullable<string>;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was created.'
  })
  createdAt: Date;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was last updated.'
  })
  updatedAt: Date;

  constructor(partial: Partial<PostTranslation>) {
    Object.assign(this, partial);
  }
}
