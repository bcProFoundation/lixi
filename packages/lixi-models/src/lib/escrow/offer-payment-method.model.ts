import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLDateTime } from 'graphql-scalars';

import { Offer } from './offer.model';
import { PaymentMethod } from './payment-method.model';

@ObjectType()
export class OfferPaymentMethod {
  @Field(() => ID)
  id: string;

  @Field(() => Offer)
  offer: Offer;

  @Field(() => String)
  offerId: string;

  @Field(() => PaymentMethod)
  paymentMethod: PaymentMethod;

  @Field(() => Number)
  paymentMethodId: number;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was created.'
  })
  createdAt: Date;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was last updated.'
  })
  updatedAt: Date;
}
