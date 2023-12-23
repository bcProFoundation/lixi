import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { GraphQLDateTime } from 'graphql-scalars';

export enum BurnForTypeItem {
  Page = 0x5f01,
  Post = 0x5f02,
  Comment = 0x5f03,
  Account = 0x5f04,
  Token = 0x5f05,
  Worship = 0x5f06
}
registerEnumType(BurnForTypeItem, {
  name: 'BurnForTypeItem'
});

@ObjectType()
export class BurnItem {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  txid: string;

  @Field(() => Boolean)
  burnType: boolean;

  @Field(() => BurnForTypeItem)
  burnForType: BurnForTypeItem;

  @Field(() => String)
  burnedBy: string;

  @Field(() => String)
  burnForId: string;

  @Field(() => Number)
  burnedValue: number;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was created.',
    nullable: true
  })
  createdAt?: Nullable<Date>;
  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was last updated.',
    nullable: true
  })
  updatedAt?: Nullable<Date>;
  constructor(partial: Partial<BurnItem>) {
    Object.assign(this, partial);
  }
}
