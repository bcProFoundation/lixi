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
    this.danaReceivedUp = 0;
    this.danaReceivedDown = 0;
    this.danaReceivedScore = 0;
    this.danaBurnUp = 0;
    this.danaBurnDown = 0;
    this.danaBurnScore = 0;
    this.version = 0;
    Object.assign(this, partial);
  }
}
