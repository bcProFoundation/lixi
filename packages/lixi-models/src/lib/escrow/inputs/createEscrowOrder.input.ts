import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional } from 'class-validator';

@InputType()
export class CreateEscrowOrderInput {
  @Field(() => String)
  @IsNotEmpty()
  sellerPublicKey: string;

  @Field(() => String)
  @IsNotEmpty()
  buyerPublicKey: string;

  @Field(() => String)
  @IsNotEmpty()
  arbitratorPublicKey: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  escrowAddress?: string;

  @Field(() => String)
  @IsNotEmpty()
  paymentMethodId: string;

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
  offerId: string;
}
