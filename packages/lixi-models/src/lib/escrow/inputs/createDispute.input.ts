import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@InputType()
export class CreateDisputeInput {
  @Field(() => String)
  @IsNotEmpty()
  escrowOrderId: string;

  @Field(() => String)
  @IsNotEmpty()
  createdBy: string;

  @Field(() => String)
  @IsNotEmpty()
  reason: string;
}
