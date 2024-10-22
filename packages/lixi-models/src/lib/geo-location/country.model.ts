import { Field, ID, ObjectType } from '@nestjs/graphql';

import { City } from './city.model';
import { State } from './state.model';
import { Nullable } from '../nullable';

@ObjectType()
export class Country {
  @Field(() => ID)
  id: number;

  @Field(() => String, { nullable: true })
  name?: Nullable<string>;

  @Field(() => String, { nullable: true })
  iso2?: Nullable<string>;

  @Field(() => String)
  capital: string;

  @Field(() => [State])
  state: [State];

  @Field(() => [City])
  city: [City];
}
