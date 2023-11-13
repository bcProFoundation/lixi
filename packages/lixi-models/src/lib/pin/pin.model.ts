import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLDateTime } from 'graphql-scalars';

import { Account } from '../account';
import { Page } from '../page';

@ObjectType()
export class Pin {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  pinableId?: Nullable<string>;

  @Field(() => Page, { nullable: true })
  page?: Page;

  @Field(() => Account, { nullable: true })
  account?: Account;

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

  constructor(partial: Partial<Pin>) {
    Object.assign(this, partial);
  }
}

export enum PinType {
  POST = 'POST',
  COMMENT = 'COMMENT'
}

@ObjectType()
export class Pinable {
  @Field(() => ID)
  id: string;

  @Field(() => PinType)
  type: PinType;
}
