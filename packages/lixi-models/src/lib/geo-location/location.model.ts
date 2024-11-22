import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Nullable } from '../nullable';

@ObjectType()
export class Location {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  country?: Nullable<string>;

  @Field(() => String, { nullable: true })
  iso2?: Nullable<string>;

  @Field(() => String, { nullable: true })
  adminNameAscii?: Nullable<string>;

  @Field(() => String, { nullable: true })
  adminCode?: Nullable<string>;

  @Field(() => String, { nullable: true })
  cityAscii?: Nullable<string>;
}
