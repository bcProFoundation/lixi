import { IBasicPageInfo, IBasicPaginated } from '@bcpros/lixi-models';
import { Database } from '@bcpros/lixi-prisma';
import { SelectQueryBuilder } from 'kysely';
import { KyselyExecutorService } from 'src/modules/prisma/kysely-executor.service';

export async function paginateRawQuery<T>(options: {
  mainQuery: SelectQueryBuilder<Database, any, any>;
  countQuery: SelectQueryBuilder<Database, any, any>;
  kyselyPrisma: KyselyExecutorService;
  first?: number;
  after?: string;
  cursorField?: string;
  cursorPrefix?: string;
}): Promise<IBasicPaginated<T>> {
  const { first = 20, after, kyselyPrisma, mainQuery, countQuery, cursorField = 'id', cursorPrefix } = options;

  // Execute both queries in parallel
  const [items, countResult] = await Promise.all([
    kyselyPrisma.executeQuery(mainQuery.compile()),
    kyselyPrisma.executeQuery(countQuery.compile())
  ]);

  const totalCount = Number(countResult[0].total);

  // Check for next page
  const hasNextPage = items.length > first;
  if (hasNextPage) {
    items.pop();
  }

  // Build edges
  const edges = items.map(item => ({
    cursor: `${cursorPrefix}:${(item as any)[cursorField] as string}`,
    node: item
  }));

  // Build pageInfo
  const pageInfo: IBasicPageInfo = {
    hasNextPage,
    endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : ''
  };

  return {
    edges,
    pageInfo,
    totalCount
  };
}

export function calculatePagination<T>(options: {
  items: T[]; // Query results from your Prisma query
  totalCount: number; // Total count from separate count query
  first?: number; // Page size
  cursorField?: keyof T; // Field to use as cursor
  cursorPrefix?: string;
}): IBasicPaginated<T> {
  const { items, totalCount, first = 20, cursorField = 'id' as keyof T, cursorPrefix = '' } = options;

  // Check for next page
  const hasNextPage = items.length > first;
  const paginatedItems = hasNextPage ? items.slice(0, first) : items;

  // Build edges
  const edges = paginatedItems.map(item => ({
    cursor: `${cursorPrefix}:${String(item[cursorField])}`,
    node: item
  }));

  // Build pageInfo
  const pageInfo: IBasicPageInfo = {
    hasNextPage,
    endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : ''
  };

  return {
    edges,
    pageInfo,
    totalCount
  };
}
