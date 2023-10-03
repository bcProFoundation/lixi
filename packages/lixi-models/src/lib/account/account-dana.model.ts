import { Field, Float, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AccountDana {
  @Field(() => ID)
  id: string;

  @Field(() => Float, { nullable: true })
  danaGiven?: number;

  @Field(() => Float, { nullable: true })
  danaReceived?: number;

  @Field(() => Float)
  danaBurnUp: number;

  @Field(() => Float)
  danaBurnDown: number;

  @Field(() => Float)
  danaBurnScore: number;

  @Field(() => [AccountDanaHistory], { nullable: true })
  accountDanaHistory?: [AccountDanaHistory];
}

@ObjectType()
export class AccountDanaHistory {
  @Field(() => ID)
  id: string;

  //Add more if needed
}
