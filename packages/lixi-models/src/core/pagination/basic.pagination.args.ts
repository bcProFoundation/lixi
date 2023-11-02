import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class BasicPaginationArgs {
  @Field(() => Number, { nullable: true })
  skip?: number;

  @Field(() => String, { nullable: true })
  after?: string;

  @Field(() => Number, { nullable: true })
  first?: number;
}
