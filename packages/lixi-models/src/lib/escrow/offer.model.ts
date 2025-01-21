import { Field, Float, ObjectType, registerEnumType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { GraphQLDateTime } from 'graphql-scalars';

import { COIN } from '../../constants/coins/coin';
import { Nullable } from '../nullable';

import { EscrowOrder } from './escrow-order.model';
import { OfferPaymentMethod } from './offer-payment-method.model';
import { Country } from '../geo-location/country.model';
import { State } from '../geo-location/state.model';
import { Location } from '../geo-location/location.model';

@ObjectType()
export class Offer {
  @Field(() => String)
  postId: string;

  @Field(() => String)
  publicKey: string;

  @Field(() => String)
  message: string;

  @Field(() => String, { nullable: true })
  noteOffer?: Nullable<string>;

  @Field(() => String)
  price: string;

  @Field(() => String, { nullable: true })
  coinPayment?: Nullable<string>;

  @Field(() => String, { nullable: true })
  coinOthers?: Nullable<string>;

  @Field(() => Float)
  marginPercentage: number;

  @Field(() => String, { nullable: true })
  localCurrency?: Nullable<string>;

  @Field(() => COIN)
  coin: COIN;

  @Field(() => Float)
  orderLimitMin: number;

  @Field(() => Float)
  orderLimitMax: number;

  @Field(() => Boolean, { nullable: true })
  hideFromHome?: Nullable<boolean>;

  @Field(() => OfferType)
  type: OfferType;

  @Field(() => [OfferPaymentMethod])
  paymentMethods: [OfferPaymentMethod];

  @Field(() => OfferStatus)
  status: OfferStatus;

  @Field(() => Number, { nullable: true })
  countryId?: Nullable<number>;

  @Field(() => Country, { nullable: true })
  country?: Nullable<Country>;

  @Field(() => Number, { nullable: true })
  stateId?: Nullable<number>;

  @Field(() => State, { nullable: true })
  state?: Nullable<State>;

  @Field(() => String, { nullable: true })
  locationId?: Nullable<string>;

  @Field(() => Location, { nullable: true })
  location?: Nullable<Location>;

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
