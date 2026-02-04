import { Field, Float, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional } from 'class-validator';

import { COIN } from '../../../../constants/coins/coin';
import { GoodsServicesPaymentType } from '../../../../constants/escrow/escrow';
import { Nullable } from '../../../nullable';
import { OfferType } from '../../offer.model';

@InputType()
export class CreateOfferInput {
  @Field(() => String)
  @IsNotEmpty()
  message: string;

  @Field(() => String, { nullable: true })
  noteOffer?: Nullable<string>;

  @Field(() => String)
  @IsNotEmpty()
  price: string;

  @Field(() => String, { nullable: true })
  coinPayment?: Nullable<string>;

  @Field(() => String, { nullable: true })
  coinOthers?: Nullable<string>;

  @Field(() => Float, { nullable: true })
  priceCoinOthers?: Nullable<number>;

  @Field(() => Float, { nullable: true })
  priceGoodsServices?: Nullable<number>;

  @Field(() => String, { nullable: true })
  tickerPriceGoodsServices?: Nullable<string>;

  @Field(() => GoodsServicesPaymentType, { nullable: true })
  @IsOptional()
  paymentTypeGoodsServices?: Nullable<GoodsServicesPaymentType>;

  @Field(() => Float)
  marginPercentage: number;

  @Field(() => String, { nullable: true })
  localCurrency?: Nullable<string>;

  @Field(() => String, { nullable: true })
  paymentApp?: Nullable<string>;

  @Field(() => COIN)
  coin: COIN;

  @Field(() => Float, { nullable: true })
  orderLimitMin: Nullable<number>;

  @Field(() => Float, { nullable: true })
  orderLimitMax: Nullable<number>;

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

  @Field(() => String, { nullable: true })
  locationId?: Nullable<string>;

  @Field(() => Boolean, { nullable: true })
  hideFromHome?: Nullable<boolean>;
}
