import { Field, Float, ObjectType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

import { Page } from './page.model';

@ObjectType()
export class PageDana {
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

  @Field(() => String)
  pageId: string;

  @Field(() => Page)
  page: Page;
}
