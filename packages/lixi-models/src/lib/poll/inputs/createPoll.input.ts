import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { GraphQLDateTime } from 'graphql-scalars';

import { Nullable } from '../../nullable';
import { COIN } from '../../../constants/coins/coin';

@InputType()
export class PollOptionInput {
  @Field(() => String, { nullable: true })
  pollId?: Nullable<string>;

  @Field(() => String)
  option: string;
}

@InputType()
export class CreatePollInput {
  @IsOptional()
  @Field(() => String, { nullable: true })
  pageId?: Nullable<string>;

  @IsOptional()
  @Field(() => String, { nullable: true })
  tokenId?: Nullable<string>;

  @Field(() => String)
  question: string;

  @Field(() => Boolean)
  singleSelect: boolean;

  @Field(() => Boolean)
  canAddOption: boolean;

  @Field(() => GraphQLDateTime)
  startDate: Date;

  @Field(() => GraphQLDateTime)
  endDate: Date;

  @IsOptional()
  @Field(() => String, { nullable: true })
  createFeeHex?: Nullable<string>;

  @IsOptional()
  @Field(() => COIN, { nullable: true })
  coinFee?: Nullable<COIN>;

  @Field(() => [PollOptionInput])
  options: PollOptionInput[];
}
