import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { GraphQLDateTime } from 'graphql-scalars';

import { COIN } from '../../constants/coins/coin';

import { EscrowOrder } from './escrow-order.model';
import { OfferPaymentMethod } from './offer-payment-method.model';

@ObjectType()
export class Offer {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  publicKey: string;

  @Field(() => String)
  title: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  description?: string;

  @Field(() => Number)
  price: number;

  @Field(() => Number)
  amount: number;

  @Field(() => COIN)
  coin: COIN;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  orderLimitMin?: number;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  orderLimitMax?: number;

  @Field(() => OfferType)
  type: OfferType;

  @Field(() => [OfferPaymentMethod])
  paymentMethods: [OfferPaymentMethod];

  @Field(() => OfferStatus)
  status: OfferStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  location?: string;

  @Field(() => [EscrowOrder], { nullable: true })
  @IsOptional()
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

export enum OfferType {
  BUY = 'BUY',
  SELL = 'SELL'
}

registerEnumType(OfferType, {
  name: 'OfferType',
  description: 'The type of offer.'
});

export enum OfferStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVE = 'ARCHIVE'
}

registerEnumType(OfferStatus, {
  name: 'OfferStatus',
  description: 'The status of offer.'
});
