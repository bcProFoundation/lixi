import { Field, InputType, registerEnumType } from '@nestjs/graphql';

import { Order } from '../../../core';

export enum ProductOrderField {
  id = 'id',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  name = 'name',
  title = 'title',
  lotusBurnScore = 'lotusBurnScore'
}

registerEnumType(ProductOrderField, {
  name: 'ProductOrderField',
  description: 'Properties by which page connections can be ordered.'
});

@InputType()
export class ProductOrder extends Order {
  @Field(() => ProductOrderField)
  field: ProductOrderField;
}
