import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';
import { COIN } from '../../../constants/coins/coin';

@InputType('ConvertDana')
export class ConvertDanaInput {
  @Field(() => Number)
  @IsNotEmpty()
  quantity: number;

  @Field(() => COIN)
  @IsNotEmpty()
  convertToCoin: COIN;
}
