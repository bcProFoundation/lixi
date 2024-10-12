import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@InputType()
export class AcceptEscrowOrderInput {
  @Field(() => String)
  @IsNotEmpty()
  orderId: string;

  @Field(() => String)
  @IsNotEmpty()
  script: string;

  @Field(() => String)
  @IsNotEmpty()
  nonce: string;
}
