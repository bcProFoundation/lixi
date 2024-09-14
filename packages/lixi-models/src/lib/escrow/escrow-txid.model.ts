import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLBigInt, GraphQLDateTime } from 'graphql-scalars';

import { EscrowOrder } from './escrow-order.model';

@ObjectType()
export class EscrowTxid {
  @Field(() => String)
  txid: string;

  @Field(() => GraphQLBigInt)
  value: number;

  @Field(() => Number)
  outIdx: number;

  @Field(() => EscrowOrder)
  escrowOrder: EscrowOrder;

  @Field(() => String)
  escrowOrderId: string;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was created.'
  })
  createdAt: Date;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was last updated.'
  })
  updatedAt: Date;
}
