import { Field, ID, ObjectType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { GraphQLDateTime } from 'graphql-scalars';

import { TokenDana } from './token-dana.model';

@ObjectType()
export class Token {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  tokenId: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  ticker: string;

  @Field(() => String)
  tokenType: string;

  @Field(() => String, { nullable: true })
  tokenDocumentUrl: Nullable<string>;

  @Field(() => String, { nullable: true })
  totalBurned: Nullable<string>;

  @Field(() => String, { nullable: true })
  totalMinted: Nullable<string>;

  @Field(() => Number)
  decimals: number;

  @Field(() => String, { nullable: true })
  initialTokenQuantity: Nullable<string>;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was created.'
  })
  createdDate: Date;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was last comments.',
    nullable: true
  })
  comments?: Nullable<Date>;

  @Field(() => Number, { nullable: true })
  rank?: Nullable<number>;

  @Field(() => Boolean, { nullable: true })
  isFollowed?: Nullable<boolean>;

  @Field(() => Number, { nullable: true })
  followersCount?: Nullable<number>;

  @IsOptional()
  @Field(() => TokenDana, { nullable: true })
  dana?: Nullable<TokenDana>;

  @Field(() => Number, { nullable: true })
  followScore?: Nullable<number>;

  constructor(partial: Partial<Token>) {
    Object.assign(this, partial);
  }
}
