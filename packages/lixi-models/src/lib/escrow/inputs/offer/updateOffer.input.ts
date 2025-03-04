import { Field, Float, InputType } from '@nestjs/graphql';
import { Nullable } from '../../../nullable';

@InputType()
export class UpdateOfferInput {
  @Field(() => String)
  id: string;

  @Field(() => String, { nullable: true })
  message?: Nullable<string>;

  @Field(() => String, { nullable: true })
  noteOffer?: Nullable<string>;

  @Field(() => Float, { nullable: true })
  marginPercentage?: Nullable<number>;

  @Field(() => Number, { nullable: true })
  orderLimitMin?: Nullable<number>;

  @Field(() => Number, { nullable: true })
  orderLimitMax?: Nullable<number>;
}

@InputType()
export class UpdateOfferHideFromHomeInput {
  @Field(() => String)
  id: string;

  @Field(() => Boolean)
  hideFromHome: boolean;
}
