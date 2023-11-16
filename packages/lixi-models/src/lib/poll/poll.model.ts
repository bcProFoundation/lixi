import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { GraphQLDateTime } from 'graphql-scalars';

import { Account } from '../account';
import { Page } from '../page';

import { PollDana } from './poll-dana.model';
import { PollOption } from './poll-option.model';

@ObjectType()
export class Poll {
  @Field(() => ID)
  id: string;

  @Field(() => Number)
  accountId: number;

  @Field(() => Account)
  account: Account;

  @Field(() => String)
  question: string;

  @IsOptional()
  @Field(() => Page, { nullable: true })
  page?: Nullable<Page>;

  @IsOptional()
  @Field(() => String, { nullable: true })
  pageId?: Nullable<string>;

  @Field(() => GraphQLDateTime)
  startDate: Date;

  @Field(() => GraphQLDateTime)
  endDate: Date;

  @Field(() => Number, { nullable: true })
  totalComments?: Nullable<number>;

  @Field(() => Float, { nullable: true })
  danaViewScore?: Nullable<number>;

  @Field(() => PollDana)
  dana?: Nullable<PollDana>;

  @Field(() => [PollOption])
  options: PollOption[];

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was created.'
  })
  createdAt: Date;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was last updated.'
  })
  updatedAt: Date;

  constructor(partial: Partial<Poll>) {
    Object.assign(this, partial);
  }
}
