import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class DistributionModel {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  address: string;

  @Field(() => String)
  distributionType: string;

  @Field(() => Number)
  lixiId: number;
}

export interface Distribution {
  id: string;
  address: string;
  distributionType: string;
  lixiId: number;
}
