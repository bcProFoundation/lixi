import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { GraphQLDateTime } from 'graphql-scalars';

import { COIN } from '../../constants/coins/coin';

import { EscrowOrder } from './escrow-order.model';
import { OfferPaymentMethod } from './offer-payment-method.model';
import { Nullable } from '../nullable';

@ObjectType()
export class Offer {
  @Field(() => String)
  postId: string;

  @Field(() => String)
  publicKey: string;

  @Field(() => String)
  message: string;

  @Field(() => String)
  price: string;

  @Field(() => COIN)
  coin: COIN;

  @Field(() => Number)
  orderLimitMin: number;

  @Field(() => Number)
  orderLimitMax: number;

  @Field(() => OfferType)
  type: OfferType;

  @Field(() => [OfferPaymentMethod])
  paymentMethods: [OfferPaymentMethod];

  @Field(() => OfferStatus)
  status: OfferStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  location?: Nullable<string>;

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

  constructor(partial: Partial<Offer>) {
    Object.assign(this, partial);
  }
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
