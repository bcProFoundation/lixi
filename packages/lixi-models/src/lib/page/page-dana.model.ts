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

  @IsOptional()
  @Field(() => String, { nullable: true })
  pageId?: Nullable<string>;

  @IsOptional()
  @Field(() => Page, { nullable: true })
  page?: Nullable<Page>;

}