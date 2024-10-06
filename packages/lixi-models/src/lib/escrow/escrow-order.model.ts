import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { GraphQLDateTime } from 'graphql-scalars';

import { Account } from '../account/account.model';
import { Nullable } from '../nullable';

import { Dispute } from './dispute.model';
import { EscrowTxid } from './escrow-txid.model';
import { Offer } from './offer.model';
import { PaymentMethod } from './payment-method.model';

@ObjectType()
export class EscrowOrder {
  @Field(() => ID)
  id: string;

  @Field(() => Account)
  sellerAccount: Account;

  @Field(() => Number)
  sellerAccountId: number;

  @Field(() => Account)
  buyerAccount: Account;

  @Field(() => Number)
  buyerAccountId: number;

  @Field(() => Account)
  arbitratorAccount: Account;

  @Field(() => Number)
  arbitratorAccountId: number;

  @Field(() => Account)
  moderatorAccount: Account;

  @Field(() => Number)
  moderatorAccountId: number;

  @Field(() => String)
  escrowAddress: string;

  @Field(() => PaymentMethod)
  paymentMethod: PaymentMethod;

  @Field(() => Number)
  paymentMethodId: number;

  @Field(() => String, { nullable: true })
  message?: Nullable<string>;

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

  @Field(() => [EscrowTxid], { nullable: true })
  escrowTxids?: Nullable<EscrowTxid[]>;

  @Field(() => String, { nullable: true })
  @IsOptional()
  releaseTxid?: Nullable<string>;

  @Field(() => String, { nullable: true })
  @IsOptional()
  returnTxid?: Nullable<string>;

  @Field(() => String, { nullable: true })
  @IsOptional()
  buyerDepositTx?: Nullable<string>;

  @Field(() => Dispute, { nullable: true })
  @IsOptional()
  dispute?: Nullable<Dispute>;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was created.'
  })
  createdAt: Date;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was last updated.'
  })
  updatedAt: Date;

  constructor(partial: Partial<EscrowOrder>) {
    Object.assign(this, partial);
  }
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
