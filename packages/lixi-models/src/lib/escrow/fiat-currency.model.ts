import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RateEntry {
  @Field(() => Float)
  ts: number;

  @Field(() => Float)
  rate: number;
}

@ObjectType()
export class CurrencyRates {
  @Field(() => String)
  coin: string;

  @Field(() => [RateEntry])
  rates: RateEntry[];
}

@ObjectType()
export class FiatRates {
  @Field(() => String)
  currency: string;

  @Field(() => [CurrencyRates])
  fiatRates: CurrencyRates[];

  constructor(partial: Partial<FiatRates>) {
    Object.assign(this, partial);
  }
}
