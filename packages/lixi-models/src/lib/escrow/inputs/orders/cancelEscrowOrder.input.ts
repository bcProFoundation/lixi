import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@InputType()
export class CancelEscrowOrderInput {
  @Field(() => String)
  @IsNotEmpty()
  orderId: string;
}
