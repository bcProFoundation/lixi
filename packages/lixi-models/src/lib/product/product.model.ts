import { Field, Float, ID, ObjectType } from '@nestjs/graphql';

import { Page } from '../page';
// import { UploadDetail } from '../upload';
import { Country, State } from '../geo-location';
import { UploadDetail } from '../upload';
import { GraphQLDateTime } from 'graphql-scalars';

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

  @Field(() => Float)
  lotusBurnUp: number;

  @Field(() => Float)
  lotusBurnDown: number;

  @Field(() => Float)
  lotusBurnScore: number;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was created.',
  })
  createdAt: Date;

  @Field(() => GraphQLDateTime, {
    description:
      'Identifies the date and time when the object was last updated.',
  })
  updatedAt: Date;

  @Field(() => [UploadDetail], { nullable: true })
  productImages: [UploadDetail];
}
