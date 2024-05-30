import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLDateTime } from 'graphql-scalars';

import { Nullable } from '../nullable';

import { PollOption } from './poll-option.model';

@ObjectType()
export class Poll {
  @Field(() => String)
  question: string;

  @Field(() => String)
  postId: string;

  @Field(() => GraphQLDateTime)
  startDate: Date;

  @Field(() => GraphQLDateTime)
  endDate: Date;

  @Field(() => [PollOption])
  options: PollOption[];

  @Field(() => Boolean)
  singleSelect: boolean;

  @Field(() => Boolean)
  canAddOption: boolean;

  @Field(() => [String], { nullable: true })
  defaultOptions?: Nullable<string[]>;

  @Field(() => Number, { nullable: true })
  totalVote?: Nullable<number>;

  constructor(partial: Partial<Poll>) {
    Object.assign(this, partial);
  }
}
