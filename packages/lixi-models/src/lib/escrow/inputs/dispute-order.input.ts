import { Field, InputType, registerEnumType } from '@nestjs/graphql';

import { Order } from '../../../core/order/order';

export enum DisputeOrderField {
  id = 'id',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt'
}

registerEnumType(DisputeOrderField, {
  name: 'DisputeOrderField',
  description: 'Properties by which offer connections can be ordered.'
});

@InputType()
export class DisputeOrder extends Order {
  @Field(() => DisputeOrderField)
  field: DisputeOrderField;
}
