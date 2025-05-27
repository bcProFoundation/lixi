import { Field, Float, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { GraphQLDateTime } from 'graphql-scalars';

import { Account } from '../account/account.model';
import { Nullable } from '../nullable';

import { BankInfo } from './bank-info/bank-info.model';
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

  @Field(() => String, { nullable: true })
  @IsOptional()
  escrowFeeAddress?: Nullable<string>;

  @Field(() => String, { nullable: true })
  @IsOptional()
  escrowBuyerDepositFeeAddress?: Nullable<string>;

  @Field(() => PaymentMethod)
  paymentMethod: PaymentMethod;

  @Field(() => Number)
  paymentMethodId: number;

  @Field(() => String, { nullable: true })
  message?: Nullable<string>;

  @Field(() => String)
  price: string;

  @Field(() => Float)
  amount: number;

  @Field(() => Float)
  amountCoinOrCurrency: number;

  @Field(() => Offer)
  offer: Offer;

  @Field(() => String)
  offerId: string;

  @Field(() => EscrowOrderStatus)
  status: EscrowOrderStatus;

  @Field(() => String)
  escrowScript: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  escrowFeeScript?: Nullable<string>;

  @Field(() => String, { nullable: true })
  @IsOptional()
  escrowBuyerDepositFeeScript?: Nullable<string>;

  @Field(() => String, { nullable: true })
  @IsOptional()
  releaseSignatory?: Nullable<string>;

  @Field(() => String, { nullable: true })
  @IsOptional()
  returnSignatory?: Nullable<string>;

  @Field(() => String, { nullable: true })
  @IsOptional()
  returnFeeSignatory?: Nullable<string>;

  @Field(() => String, { nullable: true })
  @IsOptional()
  returnBuyerDepositFeeSignatory?: Nullable<string>;

  @Field(() => String, { nullable: true })
  @IsOptional()
  signatoryOwnerHash160?: Nullable<string>;

  @Field(() => String, { nullable: true })
  @IsOptional()
  signatoryOwnerFeeHash160?: Nullable<string>;

  @Field(() => String, { nullable: true })
  @IsOptional()
  signatoryOwnerBuyerDepositFeeHash160?: Nullable<string>;

  @Field(() => String)
  nonce: string;

  @Field(() => [EscrowTxid], { nullable: true })
  escrowTxids?: Nullable<EscrowTxid[]>;

  @Field(() => BankInfo, { nullable: true })
  bankInfo?: Nullable<BankInfo>;

  @Field(() => String, { nullable: true })
  @IsOptional()
  releaseTxid?: Nullable<string>;

  @Field(() => String, { nullable: true })
  @IsOptional()
  returnTxid?: Nullable<string>;

  @Field(() => String, { nullable: true })
  @IsOptional()
  returnFeeTxid?: Nullable<string>;

  @Field(() => String, { nullable: true })
  @IsOptional()
  returnBuyerDepositFeeTxid?: Nullable<string>;

  @Field(() => String, { nullable: true })
  @IsOptional()
  buyerDepositTx?: Nullable<string>;

  @Field(() => Dispute, { nullable: true })
  @IsOptional()
  dispute?: Nullable<Dispute>;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  sellerDonateAmount?: Nullable<number>;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  buyerDonateAmount?: Nullable<number>;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  markAsPaid?: Nullable<boolean>;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  allowOfferTakerChat?: Nullable<boolean>;

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
