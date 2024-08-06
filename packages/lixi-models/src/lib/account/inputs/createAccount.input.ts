import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional } from 'class-validator';

@InputType()
export class CreateAccountInput {
  @Field(() => String)
  @IsNotEmpty()
  mnemonic: string;

  @Field(() => String)
  @IsOptional()
  encryptedMnemonic?: string;

  @Field(() => String)
  @IsOptional()
  mnemonicHash?: string;

  @Field(() => String)
  language: string;
}
