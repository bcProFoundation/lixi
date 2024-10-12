import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional } from 'class-validator';

import { COIN } from '../../../../constants/coins/coin';
import { Nullable } from '../../../nullable';
import { OfferType } from '../../offer.model';

@InputType()
export class CreateOfferInput {
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

  @IsOptional()
  @Field(() => String, { nullable: true })
  pageId?: Nullable<string>;

  @IsOptional()
  @Field(() => String, { nullable: true })
  createFeeHex?: Nullable<string>;

  @Field(() => Number, { nullable: true })
  countryId?: Nullable<number>;

  @Field(() => Number, { nullable: true })
  stateId?: Nullable<number>;
}
