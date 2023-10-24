import { Field, Float, ObjectType } from '@nestjs/graphql';

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

  constructor(partial: Partial<PageDana>) {
    Object.assign(this, partial);
  }
}
