import { Field, InputType } from '@nestjs/graphql';
import { Nullable } from '../../nullable';

@InputType()
export class OfferFilterInput {
  @Field(() => [Number], { nullable: true })
  paymentMethodIds?: Nullable<number[]>;

  @Field(() => Number, { nullable: true })
  countryId?: Nullable<number>;

  @Field(() => Number, { nullable: true })
  stateId?: Nullable<number>;
}
