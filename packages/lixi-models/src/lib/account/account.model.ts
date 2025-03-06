import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { GraphQLDateTime } from 'graphql-scalars';

import { AccountType, Role } from '../../constants/account';
import { COIN } from '../../constants/coins/coin';
import { Message } from '../message/message.model';
import { PageMessageSession } from '../message/pageMessageSession.model';
import { Nullable } from '../nullable';
import { Page } from '../page/page.model';

import { AccountDana } from './account-dana.model';

@ObjectType()
export class Account {
  @Field(() => Number)
  id: number;

  @Field(() => String)
  name: string;

  @Field(() => AccountType, { nullable: true })
  accountType?: Nullable<AccountType>;

  @Field(() => Number)
  balance?: number;

  @Field(() => String, { nullable: true })
  mnemonic?: string;

  @Field(() => String, { nullable: true })
  encryptedMnemonic?: Nullable<string>;

  @Field(() => String, { nullable: true })
  encryptedSecret?: Nullable<string>;

  @Field(() => String, { nullable: true })
  secret?: Nullable<string>;

  @Field(() => String, { nullable: true })
  publicKey?: string;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was created.'
  })
  createdAt?: Date;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was last updated.'
  })
  updatedAt?: Date;

  @Field(() => String, { nullable: true })
  mnemonicHash?: Nullable<string>;

  @Field(() => String)
  address: string;

  @Field(() => String, { nullable: true })
  hash160?: Nullable<string>;

  @Field(() => String)
  language?: string;

  @Field(() => String, { nullable: true })
  secondaryLanguage?: Nullable<string>;

  @Field(() => [Page], { nullable: true })
  pages?: [Page];

  @Field(() => Number, { nullable: true })
  followersCount?: number;

  @Field(() => Number, { nullable: true })
  followingsCount?: number;

  @Field(() => Number, { nullable: true })
  followingPagesCount?: number;

  @Field(() => [Message], { nullable: true })
  messages?: [Message];

  @Field(() => [PageMessageSession], { nullable: true })
  pageMessageSessions?: [PageMessageSession];

  @Field(() => String, { nullable: true })
  avatar?: Nullable<string>;

  @Field(() => String, { nullable: true })
  cover?: Nullable<string>;

  @Field(() => String, { nullable: true })
  description?: Nullable<string>;

  @Field(() => String, { nullable: true })
  website?: Nullable<string>;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  dayOfBirth?: Nullable<number>;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  monthOfBirth?: Nullable<number>;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  yearOfBirth?: Nullable<number>;

  @Field(() => String, { nullable: true })
  createCommentFee?: Nullable<string>;

  @Field(() => AccountDana, { nullable: true })
  accountDana?: Nullable<AccountDana>;

  @Field(() => COIN, { nullable: true })
  coin?: Nullable<COIN>;

  @Field(() => COIN, { nullable: true })
  rootCoin?: Nullable<COIN>;

  @Field(() => Number, { nullable: true })
  totalDanaViewScore?: Nullable<number>;

  @Field(() => Number, { nullable: true })
  rankNumber?: Nullable<number>;

  @Field(() => Number, { nullable: true })
  rankScore?: Nullable<number>;

  @Field(() => String, { nullable: true })
  @IsOptional()
  telegramId?: Nullable<string>;

  @Field(() => String, { nullable: true })
  @IsOptional()
  telegramUsername?: Nullable<string>;

  @Field(() => String, { nullable: true })
  @IsOptional()
  localeCashPathAvatar?: Nullable<string>;

  @Field(() => Role)
  role: Role;

  constructor(partial: Partial<Account>) {
    Object.assign(this, partial);
  }
}

registerEnumType(Role, {
  name: 'Role',
  description: 'The role of account.'
});

registerEnumType(COIN, {
  name: 'Coin',
  description: 'The type of coin.'
});

registerEnumType(AccountType, {
  name: 'AccountType',
  description: 'The type of account.'
});
