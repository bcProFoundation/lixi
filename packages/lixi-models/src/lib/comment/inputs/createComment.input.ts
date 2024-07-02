import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { COIN } from '../../../constants/coins/coin';

import { Nullable } from '../../nullable';
@InputType()
export class CreateCommentInput {
  @Field(() => String)
  @IsNotEmpty()
  commentText: string;

  @IsOptional()
  @Field(() => String, { nullable: true })
  commentByPublicKey?: Nullable<string>;

  @Field(() => String)
  commentableId: string;

  @Field(() => String, { nullable: true })
  replyToCommentId?: Nullable<string>;

  @IsOptional()
  @Field(() => String, { nullable: true })
  createFeeHex?: Nullable<string>;

  @IsOptional()
  @Field(() => String, { nullable: true })
  tipHex?: Nullable<string>;

  @IsOptional()
  @Field(() => String, { nullable: true })
  uploadId?: Nullable<string>;

  @Field(() => COIN, { nullable: true })
  coinGive?: Nullable<COIN>;
}
