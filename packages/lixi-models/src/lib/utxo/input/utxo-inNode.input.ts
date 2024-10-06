import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UtxoInNodeInput {
  @Field(() => String)
  txid: string;

  @Field(() => Number)
  outIdx: number;

  @Field(() => Number)
  value: number;
}
