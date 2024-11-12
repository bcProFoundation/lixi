import { Field, ID, ObjectType } from '@nestjs/graphql';

import { Nullable } from '../nullable';
import { GraphQLDateTime } from 'graphql-scalars';

@ObjectType()
export class Setting {
  @Field(() => ID)
  id: number;

  @Field(() => GraphQLDateTime, { nullable: true })
  lastSeedBackupTime?: Nullable<Date>;

}
