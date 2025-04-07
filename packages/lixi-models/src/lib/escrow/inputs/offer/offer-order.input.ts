import { Field, InputType, registerEnumType } from '@nestjs/graphql';

import { Order } from '../../../../core/order/order';

export enum OfferOrderField {
  relevance = 'relevance', // Default
  price = 'price',
  trades = 'completed_order',
  donationAmount = 'donation_amount'
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
