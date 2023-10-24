import { Field, Float, ObjectType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

import { Hashtag } from './hashtag.model';

@ObjectType()
export class HashtagDana {
  @Field(() => Float)
  danaBurnUp: number;

  @Field(() => Float)
  danaBurnDown: number;

  @Field(() => Float)
  danaBurnScore: number;

  @Field(() => Float)
  danaReceivedUp: number;

  @Field(() => Float)
  danaReceivedDown: number;

  @Field(() => Float)
  danaReceivedScore: number;

  @Field(() => Number)
  version: number;

  @IsOptional()
  @Field(() => String, { nullable: true })
  hashtagId?: Nullable<string>;

  @IsOptional()
  @Field(() => Hashtag, { nullable: true })
  hashtag?: Nullable<Hashtag>;

  constructor(partial: Partial<HashtagDana>) {
    Object.assign(this, partial);
  }
}
