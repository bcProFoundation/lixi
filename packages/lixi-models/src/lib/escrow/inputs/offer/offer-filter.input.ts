import { Field, InputType } from '@nestjs/graphql';
import { Nullable } from '../../../nullable';

@InputType()
export class OfferFilterInput {
  @Field(() => [Number], { nullable: true })
  paymentMethodIds?: Nullable<number[]>;

  @Field(() => String, { nullable: true })
  countryName?: Nullable<string>;

  @Field(() => String, { nullable: true })
  countryCode?: Nullable<string>;

  @Field(() => String, { nullable: true })
  stateName?: Nullable<string>;

  @Field(() => String, { nullable: true })
  adminCode?: Nullable<string>;

  @Field(() => String, { nullable: true })
  cityName?: Nullable<string>;

  @Field(() => String, { nullable: true })
  fiatCurrency?: Nullable<string>;

  @Field(() => String, { nullable: true })
  coin?: Nullable<string>;

  @Field(() => String, { nullable: true })
  paymentApp?: Nullable<string>;

  @Field(() => Number, { nullable: true })
  amount?: Nullable<number>;

  @Field(() => Boolean, { nullable: true })
  isBuyOffer?: Nullable<boolean>;
}
