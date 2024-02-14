import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { GraphQLDateTime } from 'graphql-scalars';

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

  @Field(() => [PollOptionInput])
  options: PollOptionInput[];
}
