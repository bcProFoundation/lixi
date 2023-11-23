import { Field, ID, ObjectType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { GraphQLDateTime } from 'graphql-scalars';

import { Account } from '../account';
import { ICommentableTo } from '../comment';
import { Country, State } from '../geo-location';
import { ImageUploadable } from '../imageUploadable';
import { Page } from '../page';
import { ITimelineable } from '../timeline';
import { Token } from '../token';

import { ProductDana } from './product-dana.model';

@ObjectType()
export class Product implements ICommentableTo, ITimelineable {
  @Field(() => ID)
  id: string;

  @Field(() => Number)
  accountId: number;

  @Field(() => Account)
  account: Account;

  @IsOptional()
  @Field(() => String, { nullable: true })
  tokenId?: Nullable<string>;

  @IsOptional()
  @Field(() => Token, { nullable: true })
  token?: Nullable<Token>;

  @IsOptional()
  @Field(() => Page, { nullable: true })
  page?: Nullable<Page>;

  @IsOptional()
  @Field(() => String, { nullable: true })
  pageId?: Nullable<string>;

  @Field(() => String)
  name: string;

  @Field(() => String)
  title: string;

  @Field(() => Number)
  price: number;

  @Field(() => String)
  priceUnit: string;

  @Field(() => String)
  phoneNumber?: string;

  @Field(() => Number, { nullable: true })
  categoryId?: Nullable<number>;

  @Field(() => String)
  description: string;

  @Field(() => String, { nullable: true })
  address?: Nullable<string>;

  @Field(() => Country, { nullable: true })
  country?: Country;

  @Field(() => State, { nullable: true })
  state?: State;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was created.'
  })
  createdAt: Date;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was last updated.'
  })
  updatedAt: Date;

  @Field(() => ImageUploadable, { nullable: true })
  imageUploadable?: Nullable<ImageUploadable>;

  @Field(() => String, { nullable: true })
  imageUploadableId?: Nullable<string>;

  @IsOptional()
  @Field(() => ProductDana, { nullable: true })
  dana?: Nullable<ProductDana>;

  constructor(partial: Partial<Product>) {
    Object.assign(this, partial);
  }
}
