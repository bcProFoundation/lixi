import { IBasicPageInfo, IBasicPaginated, POST_TYPE } from '@bcpros/lixi-models';
import { Prisma } from '@bcpros/lixi-prisma';
import { PrismaService } from 'src/modules/prisma/prisma.service';

export async function paginateRawQuery<T>(options: {
  mainQuery: Prisma.Sql;
  countQuery: Prisma.Sql;
  prisma: PrismaService;
  first?: number;
  after?: string;
  cursorField?: string;
  cursorPrefix?: string;
}): Promise<IBasicPaginated<T>> {
  const { first = 20, after, prisma, mainQuery, countQuery, cursorField = 'id', cursorPrefix } = options;

  // Execute both queries in parallel
  const [items, countResult] = await Promise.all([
    prisma.$queryRaw<T[]>(mainQuery),
    prisma.$queryRaw<[{ total: bigint }]>(countQuery)
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
