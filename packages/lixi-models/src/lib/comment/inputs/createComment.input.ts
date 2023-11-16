import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional } from 'class-validator';
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

  @IsOptional()
  @Field(() => String, { nullable: true })
  createFeeHex?: Nullable<string>;

  @IsOptional()
  @Field(() => String, { nullable: true })
  tipHex?: Nullable<string>;

  @IsOptional()
  @Field(() => String, { nullable: true })
  uploadId?: Nullable<string>;
}
