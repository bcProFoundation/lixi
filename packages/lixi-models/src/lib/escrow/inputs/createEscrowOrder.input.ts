import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional } from 'class-validator';

@InputType()
export class CreateEscrowOrderInput {
  @Field(() => Number)
  @IsNotEmpty()
  sellerId: number;

  @Field(() => Number)
  @IsNotEmpty()
  buyerId: number;

  @Field(() => Number)
  @IsNotEmpty()
  arbitratorId: number;

  @Field(() => Number)
  @IsNotEmpty()
  moderatorId: number;

  @Field(() => String)
  @IsNotEmpty()
  escrowScript: string;

  @Field(() => String)
  @IsNotEmpty()
  nonce: string;

  @Field(() => Number)
  @IsNotEmpty()
  paymentMethodId: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  message?: string;

  @Field(() => Number)
  @IsNotEmpty()
  price: number;

  @Field(() => Number)
  @IsNotEmpty()
  amount: number;

  @Field(() => String)
  @IsNotEmpty()
  postId: string;
}
