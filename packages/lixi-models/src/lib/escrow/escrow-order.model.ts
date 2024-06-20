import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { GraphQLDateTime } from 'graphql-scalars';

import { Dispute } from './dispute.model';
import { Offer } from './offer.model';
import { PaymentMethod } from './payment-method.model';

@ObjectType()
export class EscrowOrder {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  sellerPublicKey: string;

  @Field(() => String)
  buyerPublicKey: string;

  @Field(() => String)
  arbitratorPublicKey: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  escrowAddress?: string;

  @Field(() => PaymentMethod)
  paymentMethod: PaymentMethod;

  @Field(() => String)
  paymentMethodId: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  message?: string;

  @Field(() => Number)
  price: number;

  @Field(() => Number)
  amount: number;

  @Field(() => Offer)
  offer: Offer;

  @Field(() => String)
  offerId: string;

  @Field(() => EscrowOrderStatus)
  status: EscrowOrderStatus;

  @Field(() => Dispute, { nullable: true })
  @IsOptional()
  dispute?: Dispute;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was created.'
  })
  createdAt: Date;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was last updated.'
  })
  updatedAt: Date;
}

export enum EscrowOrderStatus {
  ACTIVE = 'ACTIVE',
  ESCROW = 'ESCROW',
  COMPLETE = 'COMPLETE'
}

registerEnumType(EscrowOrderStatus, {
  name: 'EscrowOrderStatus',
  description: 'The status of escrow order.'
});
