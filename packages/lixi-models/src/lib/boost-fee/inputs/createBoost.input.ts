import { Field, InputType } from '@nestjs/graphql';
import { BoostForType, BoostType } from '../boost-fee.model';

@InputType()
export class CreateBoostInput {
  @Field(() => BoostType)
  boostType: BoostType;

  @Field(() => BoostForType)
  boostForType: BoostForType;

  @Field(() => String)
  boostedBy: string;

  @Field(() => String)
  boostForId: string;

  @Field(() => Number)
  boostedValue: number;

  @Field(() => String)
  txHex: string;
}
