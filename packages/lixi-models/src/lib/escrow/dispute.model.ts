import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { GraphQLDateTime } from 'graphql-scalars';

import { EscrowOrder } from './escrow-order.model';

@ObjectType()
export class Dispute {
  @Field(() => ID)
  id: string;

  @Field(() => EscrowOrder)
  escrowOrder: EscrowOrder;

  @Field(() => String)
  escrowOrderId: string;

  @Field(() => String)
  createdBy: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  reason?: string;

  @Field(() => DisputeStatus)
  status: DisputeStatus;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was created.'
  })
  createdAt: Date;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was last updated.'
  })
  updatedAt: Date;
}

export enum DisputeStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED'
}

registerEnumType(DisputeStatus, {
  name: 'DisputeStatus',
  description: 'The status of dispute.'
});
