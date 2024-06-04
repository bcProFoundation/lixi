import { Field, InputType, registerEnumType } from '@nestjs/graphql';

import { Order } from '../../../core/order/order';

export enum OfferOrderField {
  id = 'id',
  price = 'price',
  amount = 'amount',
  orderLimitMin = 'orderLimitMin',
  orderLimitMax = 'orderLimitMax',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt'
}

registerEnumType(OfferOrderField, {
  name: 'OfferOrderField',
  description: 'Properties by which offer connections can be ordered.'
});

@InputType()
export class OfferOrder extends Order {
  @Field(() => OfferOrderField)
  field: OfferOrderField;
}
