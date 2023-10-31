import { PaginationArgs } from '@bcpros/lixi-models';
import { PageQueryItem } from '@generated/index';
import { createEntityAdapter } from '@reduxjs/toolkit';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLazyPagesByFollowerQuery, usePagesByFollowerQuery } from './pages.generated';

const followPagesAdapter = createEntityAdapter<PageQueryItem>({
  selectId: entity => entity.id
});

const { selectAll, selectEntities, selectIds, selectTotal } = followPagesAdapter.getSelectors();

export function useInfinitePagesByFollowerIdQuery(
  params: PaginationArgs,
  fetchAll = false // if `true`: auto do next fetches to get all notes at once
) {
  const baseResult = usePagesByFollowerQuery(params);

  const [trigger, nextResult] = useLazyPagesByFollowerQuery();
  const [combinedData, setCombinedData] = useState(followPagesAdapter.getInitialState({}));

  const isBaseReady = useRef(false);
  const isNextDone = useRef(true);

  // next: starts with a null, fetching ended with an undefined cursor
  const next = useRef<null | string | undefined>(null);

  const data = useMemo(() => {
    const result = selectAll(combinedData);
    return result;
  }, [combinedData]);

  // Base result
  useEffect(() => {
    next.current = baseResult.data?.pagesByFollower?.pageInfo?.endCursor;
    if (baseResult?.data?.pagesByFollower) {
      isBaseReady.current = true;

      const baseResultParse = baseResult.data.pagesByFollower.edges.reduce((entities, edge) => {
        const entity = edge.node;
        if (entity) {
          return { ...entities, [entity.id]: entity };
        }
        return entities;
      }, {});
      const adapterSetAll = followPagesAdapter.setAll(combinedData, baseResultParse);

      setCombinedData(adapterSetAll);
      fetchAll && fetchNext();
    }
  }, [baseResult]);

  const fetchNext = async () => {
    if (!isBaseReady.current || !isNextDone.current || next.current === undefined || next.current === null) {
      return;
    }

    try {
      isNextDone.current = false;
      await trigger({
        ...params,
        after: next.current
      });
    } catch (e) {
    } finally {
      isNextDone.current = true;
      fetchAll && fetchNext();
    }
  };

  const refetch = async () => {
    isBaseReady.current = false;
    next.current = null; // restart
    await baseResult.refetch(); // restart with a whole new refetching
  };

  return {
    data: data ?? [],
    totalCount: baseResult?.data?.pagesByFollower?.totalCount ?? 0,
    error: baseResult?.error,
    isError: baseResult?.isError,
    isLoading: baseResult?.isLoading,
    isFetching: baseResult?.isFetching || nextResult?.isFetching,
    errorNext: nextResult?.error,
    isErrorNext: nextResult?.isError,
    isFetchingNext: nextResult?.isFetching,
    hasNext: !!baseResult.data?.pagesByFollower?.pageInfo?.hasNextPage,
    fetchNext,
    refetch
  };
}
