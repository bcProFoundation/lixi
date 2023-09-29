import { Field, Float, ObjectType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

import { Token } from './token.model';

@ObjectType()
export class TokenDana {
  @Field(() => Float)
  danaBurnUp: number;

  @Field(() => Float)
  danaBurnDown: number;

  @Field(() => Float)
  danaBurnScore: number;

  @IsOptional()
  @Field(() => String, { nullable: true })
  tokenId?: Nullable<string>;

  @IsOptional()
  @Field(() => Token, { nullable: true })
  token?: Nullable<Token>;
}
