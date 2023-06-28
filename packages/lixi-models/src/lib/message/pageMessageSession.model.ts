import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLDateTime } from 'graphql-scalars';

import { Account } from '../account';
import { Page } from '../page';

import { MessageSession } from './messageSession.model';

@ObjectType()
export class PageMessageSession {
  @Field(() => ID)
  id: string;

  @Field(() => Page, { nullable: true })
  page?: Page;

  @Field(() => Account, { nullable: true })
  account?: Account;

  @Field(() => [MessageSession], { nullable: true })
  messageSessions?: [MessageSession];

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
}
