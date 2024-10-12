import { Field, InputType, registerEnumType } from '@nestjs/graphql';

import { Order } from '../../../../core/order/order';

export enum EscrowOrderOrderField {
  id = 'id',
  price = 'price',
  amount = 'amount',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt'
}

registerEnumType(EscrowOrderOrderField, {
  name: 'EscrowOrderOrderField',
  description: 'Properties by which escrow order connections can be ordered.'
});

@InputType()
export class EscrowOrderOrder extends Order {
  @Field(() => EscrowOrderOrderField)
  field: EscrowOrderOrderField;
}
