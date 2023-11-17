import { Field, ID, ObjectType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { GraphQLDateTime } from 'graphql-scalars';

import { Country, State } from '../geo-location';
import { Page } from '../page';

import { ProductDana } from './product-dana.model';

@ObjectType()
export class Product {
  @Field(() => ID)
  id: string;

  @Field(() => Page)
  page: Page;

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

  @Field(() => String, { nullable: true })
  categoryId?: string;

  @Field(() => String)
  description: string;

  @Field(() => String, { nullable: true })
  address?: string;

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

  @Field(() => String)
  imageUploadableId: string;

  @IsOptional()
  @Field(() => ProductDana, { nullable: true })
  dana?: Nullable<ProductDana>;

  constructor(partial: Partial<Product>) {
    Object.assign(this, partial);
  }
}
