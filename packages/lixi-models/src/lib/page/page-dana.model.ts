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
    this.danaReceivedUp = 0;
    this.danaReceivedDown = 0;
    this.danaReceivedScore = 0;
    this.danaBurnUp = 0;
    this.danaBurnDown = 0;
    this.danaBurnScore = 0;
    this.version = 0;
    Object.assign(this, partial);
  }
}
