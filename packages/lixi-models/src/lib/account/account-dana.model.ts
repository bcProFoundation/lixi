import { Field, Float, ID, ObjectType } from '@nestjs/graphql';

import { Account } from './account.model';

@ObjectType()
export class AccountDana {
  @Field(() => ID)
  id: string;

  @Field(() => Float, { nullable: true })
  danaGiven?: number;

  @Field(() => Float, { nullable: true })
  danaReceived?: number;

  @Field(() => Float)
  danaReceivedUp: number;

  @Field(() => Float)
  danaReceivedDown: number;

  @Field(() => Float)
  danaReceivedScore: number;

  @Field(() => Float)
  danaBurnUp: number;

  @Field(() => Float)
  danaBurnDown: number;

  @Field(() => Float)
  danaBurnScore: number;

  @Field(() => Number)
  version: number;

  @Field(() => Account)
  account: Account;

  @Field(() => Number)
  accountId: number;

  @Field(() => [AccountDanaHistory], { nullable: true })
  accountDanaHistory?: [AccountDanaHistory];

  constructor(partial: Partial<AccountDana>) {
    this.danaGiven = 0;
    this.danaReceived = 0;
    this.danaReceivedUp = 0;
    this.danaReceivedDown = 0;
    this.danaReceivedScore = 0;
    this.danaBurnUp = 0;
    this.danaBurnDown = 0;
    this.danaBurnScore = 0;
    this.version = 0;
    Object.assign(this, partial);
  }
}

@ObjectType()
export class AccountDanaHistory {
  @Field(() => ID)
  id: string;

  //Add more if needed
}
