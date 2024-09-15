import { Field, InputType } from '@nestjs/graphql';
import { Nullable } from '../../nullable';

@InputType()
export class OfferFilterInput {
  @Field(() => [Number], { nullable: true })
  paymentMethodIds?: Nullable<number[]>;

  @Field(() => Number, { nullable: true })
  countryId?: Nullable<number>;

  @Field(() => String, { nullable: true })
  countryName?: Nullable<string>;

  @Field(() => Number, { nullable: true })
  stateId?: Nullable<number>;

  @Field(() => String, { nullable: true })
  stateName?: Nullable<string>;
}
