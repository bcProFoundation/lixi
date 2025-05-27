import { Field, Float, InputType, registerEnumType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional } from 'class-validator';

@InputType()
export class UpdateEscrowOrderSignatoryInput {
  @Field(() => String)
  @IsNotEmpty()
  orderId: string;

  @Field(() => EscrowOrderAction)
  @IsNotEmpty()
  action: EscrowOrderAction;

  @Field(() => String)
  @IsNotEmpty()
  signatory: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  signatoryOwnerHash160?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  signatoryOwnerFeeHash160?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  signatoryOwnerBuyerDepositFeeHash160?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  sellerDonateAmount?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  buyerDonateAmount?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  socketId?: string;
}

export enum EscrowOrderAction {
  RELEASE = 'RELEASE',
  RETURN = 'RETURN',
  RETURN_FEE = 'RETURN_FEE',
  RETURN_BUYER_FEE = 'RETURN_BUYER_FEE'
}

registerEnumType(EscrowOrderAction, {
  name: 'EscrowOrderAction',
  description: 'The action of escrow order.'
});
