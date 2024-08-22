import { Field, ID, ObjectType } from '@nestjs/graphql';

import { City } from './city.model';
import { Country } from './country.model';
import { Nullable } from '../nullable';

@ObjectType()
export class State {
  @Field(() => ID)
  id: number;

  @Field(() => String, { nullable: true })
  name?: Nullable<string>;

  @Field(() => City)
  country: Country;

  @Field(() => [City])
  city: [string];
}
