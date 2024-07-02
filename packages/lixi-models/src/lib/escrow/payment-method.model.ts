import { Field, ID, ObjectType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { GraphQLDateTime } from 'graphql-scalars';

import { EscrowOrder } from './escrow-order.model';
import { OfferPaymentMethod } from './offer-payment-method.model';

@ObjectType()
export class PaymentMethod {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  message?: string;

  @Field(() => [OfferPaymentMethod], { nullable: true })
  offerPaymentMethods?: [OfferPaymentMethod];

  @Field(() => [EscrowOrder], { nullable: true })
  escrowOrders?: [EscrowOrder];

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was created.'
  })
  createdAt: Date;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was last updated.'
  })
  updatedAt: Date;
}
