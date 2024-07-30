import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional } from 'class-validator';

import { COIN } from '../../../constants/coins/coin';
import { OfferType } from '../offer.model';

@InputType()
export class CreateOfferInput {
  @Field(() => String)
  @IsNotEmpty()
  publicKey: string;

  @Field(() => String)
  @IsNotEmpty()
  message: string;

  @Field(() => String)
  @IsNotEmpty()
  price: string;

  @Field(() => COIN)
  coin: COIN;

  @Field(() => Number)
  orderLimitMin: number;

  @Field(() => Number)
  orderLimitMax: number;

  @Field(() => OfferType)
  type: OfferType;

  @Field(() => [Number])
  @IsNotEmpty()
  paymentMethodIds: [number];

  @Field(() => String, { nullable: true })
  @IsOptional()
  location?: string;
}
