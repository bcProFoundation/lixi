import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { GraphQLDateTime } from 'graphql-scalars';

import { Account } from '../account/account.model';

import { Dispute } from './dispute.model';
import { Offer } from './offer.model';
import { PaymentMethod } from './payment-method.model';

@ObjectType()
export class EscrowOrder {
  @Field(() => ID)
  id: string;

  @Field(() => Account)
  sellerAccount: Account;

  @Field(() => Account)
  buyerAccount: Account;

  @Field(() => Account)
  arbitratorAccount: Account;

  @Field(() => Account)
  moderatorAccount: Account;

  @Field(() => String, { nullable: true })
  @IsOptional()
  escrowAddress?: string;

  @Field(() => PaymentMethod)
  paymentMethod: PaymentMethod;

  @Field(() => Number)
  paymentMethodId: number;

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

  @Field(() => String)
  escrowScript: string;

  @Field(() => String)
  nonce: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  escrowTxid?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  releaseTxid?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  cancelTxid?: string;

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
  PENDING = 'PENDING',
  ESCROW = 'ESCROW',
  COMPLETE = 'COMPLETE',
  CANCEL = 'CANCEL'
}

registerEnumType(EscrowOrderStatus, {
  name: 'EscrowOrderStatus',
  description: 'The status of escrow order.'
});
