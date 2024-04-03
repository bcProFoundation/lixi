import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AccountAddress {
  @Field(() => String)
  id: string;

  @Field(() => Number)
  accountId: number;

  @Field(() => String, { nullable: true })
  xpiAddress?: string;

  @Field(() => String, { nullable: true })
  xpiAddressHash160?: string;

  @Field(() => String, { nullable: true })
  publicKey?: string;

  @Field(() => String, { nullable: true })
  xecAddress?: string;

  constructor(partial: Partial<AccountAddress>) {
    Object.assign(this, partial);
  }
}
