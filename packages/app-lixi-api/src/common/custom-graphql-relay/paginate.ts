import { IBasicPaginated, IEdge } from '@bcpros/lixi-models';
import { InternalServerErrorException } from '@nestjs/common';
import { Redis } from 'ioredis';
import _ from 'lodash';
import SortedSet from 'redis-sorted-set';

export function createEdge<T>(instance: T, cursorKey?: keyof T): IEdge<T> {
  try {
    return {
      node: instance,
      cursor: _.isString(instance) ? instance : cursorKey ? _.get(instance, cursorKey, '') : instance?.toString()
    };
  } catch (_) {
    throw new InternalServerErrorException('The given cursor is invalid');
  }
}

export function basicPaginate<T>(
  instances: T[],
  totalCount: number,
  startRank: number,
  cursorKey?: keyof T
): IBasicPaginated<T> {
  const pages: IBasicPaginated<T> = {
    totalCount,
    edges: [],
    pageInfo: {
      endCursor: '',
      hasNextPage: false
    }
  };

  const len = instances.length;

  if (len > 0) {
    for (let i = 0; i < len; i++) {
      const edge: IEdge<T> = createEdge<T>(instances[i], cursorKey);
      pages.edges.push(edge);
    }
    pages.pageInfo.endCursor = pages.edges[len - 1].cursor;
    pages.pageInfo.hasNextPage = totalCount > startRank + 1;
  }

  return pages;
}

export async function basicSortedSetPagination(
  redis: Redis,
  key: string,
  first: number,
  after?: string
): Promise<IBasicPaginated<string>> {
  // We assume that the key is existed
  let startRank = 0;
  let cursorRank = null;
  if (after) {
    cursorRank = await redis.zrevrank(key, after!);
    startRank = cursorRank ? cursorRank + 1 : 0;
  }

  // and the rank of latest item in the sorted set
  const totalCount = await redis.zcard(key);
  const lastKnownRank = totalCount - 1;
  const endRank = Math.min(startRank + first - 1, lastKnownRank);
  const ids = await redis.zrevrange(key, startRank, endRank);
  return basicPaginate<string>(ids, totalCount, startRank);
}

export async function basicInMemorySortedSetPagination(sortedSet: any, first: number, after?: string) {
  let startRank = 0;
  let cursorRank = null;
  if (after) {
    cursorRank = sortedSet.rank(after!);
    startRank = cursorRank ? cursorRank + 1 : 0;
  }

  // and the rank of latest item in the sorted set
  const totalCount = sortedSet.length;
  const lastKnownRank = totalCount - 1;
  const endRank = Math.min(startRank + first - 1, lastKnownRank);
  const ids = await sortedSet.range(startRank, endRank);
  return basicPaginate<string>(ids, totalCount, startRank);
}
