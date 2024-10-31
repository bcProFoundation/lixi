import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional } from 'class-validator';

import { UtxoInNodeInput } from '../../utxo/input/utxo-inNode.input';
import { EscrowOrderStatus } from '../escrow-order.model';

@InputType()
export class UpdateEscrowOrderInput {
  @Field(() => String)
  @IsNotEmpty()
  orderId: string;

  @Field(() => EscrowOrderStatus)
  @IsNotEmpty()
  status: EscrowOrderStatus;

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
}
