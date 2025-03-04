import { Field, InputType } from '@nestjs/graphql';

import { Nullable } from '../../nullable';

@InputType()
export class BankInfoInput {
  @Field(() => String, { nullable: true })
  bankName?: Nullable<string>;

  @Field(() => String, { nullable: true })
  accountNameBank?: Nullable<string>;

  @Field(() => String, { nullable: true })
  accountNumberBank?: Nullable<string>;

  @Field(() => String, { nullable: true })
  appName?: Nullable<string>;

  @Field(() => String, { nullable: true })
  accountNameApp?: Nullable<string>;

  @Field(() => String, { nullable: true })
  accountNumberApp?: Nullable<string>;
}
