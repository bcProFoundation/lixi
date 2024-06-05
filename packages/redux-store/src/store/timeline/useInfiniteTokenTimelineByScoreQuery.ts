import { PaginationArgs } from '@bcpros/lixi-models/core/pagination/pagination.args';
import { createEntityAdapter } from '@reduxjs/toolkit';
import { useEffect, useMemo, useRef, useState } from 'react';

import { TimelineQueryItem } from 'src/generated/index';
import { useLazyTokenTimelineQuery, useTokenTimelineQuery } from './timeline.api';

const tokenTimelineAdapter = createEntityAdapter<TimelineQueryItem, string>({
  selectId: item => item.id
});

const { selectAll } = tokenTimelineAdapter.getSelectors();

interface TimelineListParams extends PaginationArgs {
  id: string;
}

export function useInfiniteTokenTimelineByScoreQuery(
  params: TimelineListParams,
  fetchAll = false // if `true`: auto do next fetches to get all notes at once
) {
  const baseResult = useTokenTimelineQuery(params);

  const [trigger, nextResult] = useLazyTokenTimelineQuery();
  const [combinedData, setCombinedData] = useState(tokenTimelineAdapter.getInitialState({}));

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
    next.current = baseResult.data?.tokenTimeline?.pageInfo?.endCursor;
    if (baseResult?.data?.tokenTimeline) {
      isBaseReady.current = true;

      const adapterSetAll = tokenTimelineAdapter.setAll(
        combinedData,
        baseResult.data.tokenTimeline.edges.map(item => item.node)
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
    totalCount: baseResult?.data?.tokenTimeline?.totalCount ?? 0,
    error: baseResult?.error,
    isError: baseResult?.isError,
    isLoading: baseResult?.isLoading,
    isFetching: baseResult?.isFetching || nextResult?.isFetching,
    errorNext: nextResult?.error,
    isErrorNext: nextResult?.isError,
    isFetchingNext: nextResult?.isFetching,
    hasNext: !!baseResult.data?.tokenTimeline?.pageInfo?.hasNextPage,
    fetchNext,
    refetch
  };
}
