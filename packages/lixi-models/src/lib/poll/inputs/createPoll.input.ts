import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { GraphQLDateTime } from 'graphql-scalars';

@InputType()
export class PollOptionInput {
  @Field(() => Number)
  pollId: number;

  @Field(() => String)
  option: string;
}

@InputType()
export class CreatePollInput {
  @Field(() => String)
  @IsNotEmpty()
  htmlContent: string;

  @Field(() => String)
  @IsNotEmpty()
  pureContent: string;

  @IsOptional()
  @Field(() => String, { nullable: true })
  pageId?: Nullable<string>;

  @IsOptional()
  @Field(() => String, { nullable: true })
  tokenId?: Nullable<string>;

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
