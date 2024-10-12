import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { Nullable } from '../../../nullable';
import { UtxoInNodeInput } from '../../../utxo/input/utxo-inNode.input';

@InputType()
export class CreateEscrowOrderInput {
  @Field(() => Number)
  @IsNotEmpty()
  sellerId: number;

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
  escrowAddress: string;

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

  @Field(() => String, { nullable: true })
  @IsOptional()
  buyerDepositTx?: Nullable<string>;

  @Field(() => UtxoInNodeInput, { nullable: true })
  @IsOptional()
  utxoInProcess?: Nullable<UtxoInNodeInput>;

  @Field(() => String)
  @IsNotEmpty()
  postId: string;
}
