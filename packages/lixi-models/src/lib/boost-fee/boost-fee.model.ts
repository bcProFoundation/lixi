import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { GraphQLDateTime } from 'graphql-scalars';

@ObjectType()
export class BoostFee {
  @Field(() => String)
  id: string;

  @Field(() => String)
  txid: string;

  @Field(() => BoostType)
  boostType: BoostType;

  @Field(() => BoostForType)
  boostForType: BoostForType;

  @Field(() => String)
  boostedByHash: string;

  @Field(() => String)
  boostForId: string;

  @Field(() => Number)
  boostedValue: number;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was created.',
    nullable: true
  })
  createdAt?: Date;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was last updated.',
    nullable: true
  })
  updatedAt?: Date;

  constructor(partial: Partial<BoostFee>) {
    Object.assign(this, partial);
  }
}

export enum BoostType {
  Up = 1,
  Down = 0
}
registerEnumType(BoostType, {
  name: 'BoostType',
  description: 'The type of boost.'
});

export enum BoostForType {
  Page = 0x5f01,
  Post = 0x5f02,
  Comment = 0x5f03,
  Account = 0x5f04,
  Token = 0x5f05,
  Worship = 0x5f06
}
registerEnumType(BoostForType, {
  name: 'BoostForType',
  description: 'Boost for something.'
});
