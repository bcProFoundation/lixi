import { Field, Float, ObjectType } from '@nestjs/graphql';

import { Product } from './product.model';

@ObjectType()
export class ProductDana {
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
  productId: string;

  @Field(() => Product)
  product: Product;

  constructor(partial: Partial<ProductDana>) {
    Object.assign(this, partial);
  }
}
