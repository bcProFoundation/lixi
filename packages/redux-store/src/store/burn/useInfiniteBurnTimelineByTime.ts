import { PaginationArgs } from '@bcpros/lixi-models/core/pagination/pagination.args';
import { createEntityAdapter } from '@reduxjs/toolkit';
import _ from 'lodash';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BurnQueryItem } from '@generated/types';
import { useLazyPostBurnHistoryQuery, usePostBurnHistoryQuery } from './burn.api';

const burnsAdapter = createEntityAdapter<BurnQueryItem, string>({
  selectId: burn => burn.id,
  sortComparer: (a, b) => b.createdAt - a.createdAt
});

const { selectAll } = burnsAdapter.getSelectors();

interface burnListByPageIdParams extends PaginationArgs {
  id: string;
}

export function useInfiniteBurnTimelineByTime(
  params: burnListByPageIdParams,
  fetchAll = false // if `true`: auto do next fetches to get all notes at once
) {
  const baseResult = usePostBurnHistoryQuery(params, {
    skip: !params?.id
  });

  const [trigger, nextResult] = useLazyPostBurnHistoryQuery();
  const [combinedData, setCombinedData] = useState(burnsAdapter.getInitialState({}));

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
    next.current = baseResult.data?.postBurnHistory?.pageInfo?.endCursor;
    if (baseResult?.data?.postBurnHistory) {
      isBaseReady.current = true;

      const baseResultParse = baseResult.data.postBurnHistory.edges.map(item => item.node);
      const adapterSetAll = burnsAdapter.setAll(
        combinedData,
        baseResult.data.postBurnHistory.edges.map(item => item.node)
      );

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
    totalCount: baseResult?.data?.postBurnHistory?.totalCount ?? 0,
    error: baseResult?.error,
    isError: baseResult?.isError,
    isLoading: baseResult?.isLoading,
    isFetching: baseResult?.isFetching || nextResult?.isFetching,
    errorNext: nextResult?.error,
    isErrorNext: nextResult?.isError,
    isFetchingNext: nextResult?.isFetching,
    hasNext: !!baseResult.data?.postBurnHistory?.pageInfo?.hasNextPage,
    fetchNext,
    refetch
  };
}
