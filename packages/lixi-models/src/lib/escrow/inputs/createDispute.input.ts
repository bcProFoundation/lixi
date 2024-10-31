import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional } from 'class-validator';

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

  @Field(() => String, { nullable: true })
  @IsOptional()
  socketId?: string;
}
