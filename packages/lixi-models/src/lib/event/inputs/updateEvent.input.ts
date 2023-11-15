import { Field, ID, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@InputType()
export class UpdateEventInput {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  @IsNotEmpty()
  pureContent: string;

  @Field(() => String)
  @IsNotEmpty()
  htmlContent: string;
}
