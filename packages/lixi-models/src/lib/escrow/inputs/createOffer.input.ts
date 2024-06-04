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
  title: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  description?: string;

  @Field(() => Number)
  @IsNotEmpty()
  price: number;

  @Field(() => Number)
  @IsNotEmpty()
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

  @Field(() => [String])
  @IsNotEmpty()
  paymentMethodIds: [string];

  @Field(() => String, { nullable: true })
  @IsOptional()
  location?: string;
}
