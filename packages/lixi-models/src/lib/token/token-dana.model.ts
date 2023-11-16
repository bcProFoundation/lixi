import { Field, Float, ObjectType } from '@nestjs/graphql';

import { Token } from './token.model';

@ObjectType()
export class TokenDana {
  @Field(() => Float)
  danaBurnUp: number;

  @Field(() => Float)
  danaBurnDown: number;

  @Field(() => Float)
  danaBurnScore: number;

  @Field(() => Float)
  danaReceivedUp: number;

  @Field(() => Float)
  danaReceivedDown: number;

  @Field(() => Float)
  danaReceivedScore: number;

  @Field(() => Number)
  version: number;

  @Field(() => String)
  tokenId: string;

  @Field(() => Token)
  token: Token;

  constructor(partial: Partial<TokenDana>) {
    Object.assign(this, partial);
  }
}
