import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UtxoInNode {
  @Field(() => String)
  txid: string;

  @Field(() => Number)
  outIdx: number;

  @Field(() => Number)
  value: number;
}
