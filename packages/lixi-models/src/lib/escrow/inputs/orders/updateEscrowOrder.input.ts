import { Field, Float, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional } from 'class-validator';

import { UtxoInNodeInput } from '../../../utxo/input/utxo-inNode.input';
import { EscrowOrderStatus } from '../../escrow-order.model';

@InputType()
export class UpdateEscrowOrderInput {
  @Field(() => String)
  @IsNotEmpty()
  orderId: string;

  @Field(() => EscrowOrderStatus, { nullable: true })
  @IsOptional()
  status?: EscrowOrderStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  txid?: string;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  outIdx?: number;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  value?: number;

  @Field(() => UtxoInNodeInput, { nullable: true })
  @IsOptional()
  utxoInNodeOfBuyer?: UtxoInNodeInput;

  @Field(() => String, { nullable: true })
  @IsOptional()
  socketId?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  sellerDonateAmount?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  buyerDonateAmount?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  amount?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  price?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  markAsPaid?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  allowOfferTakerChat?: boolean;
}
