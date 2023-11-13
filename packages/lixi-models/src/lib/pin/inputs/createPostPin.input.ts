import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@InputType()
export class CreatePostPinInput {
  @Field(() => String)
  @IsNotEmpty()
  postId: string;

  @Field(() => String, { nullable: true })
  pageId?: string;

  @Field(() => Number, { nullable: true })
  accountId?: number;
}
