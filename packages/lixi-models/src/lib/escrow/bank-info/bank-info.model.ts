import { Field, ObjectType, ID } from '@nestjs/graphql';
import { Nullable } from '../../nullable';

@ObjectType()
export class BankInfo {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  orderId: string;

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
