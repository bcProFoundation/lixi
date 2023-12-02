import { PaginationArgs } from '@bcpros/lixi-models';
import { createEntityAdapter } from '@reduxjs/toolkit';
import { useEffect, useMemo, useRef, useState } from 'react';

import { TimelineQueryItem } from '@generated/index';
import { useLazyPageTimelineByTimeQuery, usePageTimelineByTimeQuery } from './timeline.api';

const pageTimelineAdapter = createEntityAdapter<TimelineQueryItem>({
  selectId: item => item.id
});

const { selectAll } = pageTimelineAdapter.getSelectors();

interface PageTimelineByTimeListParams extends PaginationArgs {
  id: string;
  level: number;
  showNegative: boolean;
}

export function useInfinitePageTimelineByTimeQuery(
  params: PageTimelineByTimeListParams,
  fetchAll = false // if `true`: auto do next fetches to get all notes at once
) {
  const baseResult = usePageTimelineByTimeQuery(params);

  const [trigger, nextResult] = useLazyPageTimelineByTimeQuery();
  const [combinedData, setCombinedData] = useState(pageTimelineAdapter.getInitialState({}));

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
    next.current = baseResult.data?.pageTimelineByTime?.pageInfo?.endCursor;
    if (baseResult?.data?.pageTimelineByTime) {
      isBaseReady.current = true;

      const adapterSetAll = pageTimelineAdapter.setAll(
        combinedData,
        baseResult.data.pageTimelineByTime.edges.map(item => item.node)
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
    data.length = 0; // delete data from memo
    await baseResult.refetch(); // restart with a whole new refetching
  };
  return {
    data: data ?? [],
    totalCount: baseResult?.data?.pageTimelineByTime?.totalCount ?? 0,
    error: baseResult?.error,
    isError: baseResult?.isError,
    isLoading: baseResult?.isLoading,
    isFetching: baseResult?.isFetching || nextResult?.isFetching,
    errorNext: nextResult?.error,
    isErrorNext: nextResult?.isError,
    isFetchingNext: nextResult?.isFetching,
    hasNext: !!baseResult.data?.pageTimelineByTime?.pageInfo?.hasNextPage,
    fetchNext,
    refetch
  };
}
