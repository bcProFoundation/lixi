import { Type } from '@nestjs/common';
import { Field, Int, ObjectType } from '@nestjs/graphql';

import { Edge } from './edge.type';
import { IBasicPageInfo, IBasicPaginated } from './paginated.interface';

@ObjectType('BasicPageInfo')
abstract class PageInfoType implements IBasicPageInfo {
  @Field(() => String)
  public endCursor: string;

  @Field(() => Boolean)
  public hasNextPage: boolean;
}

export function BasicPaginated<T>(classRef: Type<T>): Type<IBasicPaginated<T>> {
  @ObjectType(`${classRef.name}BasicEdge`)
  abstract class EdgeType extends Edge(classRef) {}

  @ObjectType({ isAbstract: true })
  abstract class PaginatedType implements IBasicPaginated<T> {
    @Field(() => Int)
    public totalCount: number;

    @Field(() => [EdgeType])
    public edges: EdgeType[];

    @Field(() => PageInfoType)
    public pageInfo: PageInfoType;
  }
  return PaginatedType as Type<IBasicPaginated<T>>;
}
