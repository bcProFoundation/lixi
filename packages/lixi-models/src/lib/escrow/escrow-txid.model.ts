import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLBigInt, GraphQLDateTime } from 'graphql-scalars';

import { EscrowOrder } from './escrow-order.model';
import { Nullable } from '../nullable';

@ObjectType()
export class EscrowTxid {
  @Field(() => String)
  txid: string;

  @Field(() => GraphQLBigInt)
  value: number;

  @Field(() => GraphQLBigInt)
  feeValue: number;

  @Field(() => GraphQLBigInt, { nullable: true })
  buyerDepositFeeValue?: Nullable<number>;

  @Field(() => Number)
  outIdx: number;

  @Field(() => Number)
  feeOutIdx: number;

  @Field(() => Number, { nullable: true })
  buyerDepositFeeOutIdx?: Nullable<number>;

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
