import { PaginationArgs } from '@bcpros/lixi-models';
import { createEntityAdapter } from '@reduxjs/toolkit';
import { useEffect, useMemo, useRef, useState } from 'react';

import { TimelineQueryItem } from '@generated/index';
import { useLazyProfileTimelineQuery, useProfileTimelineQuery } from './timeline.api';

const profileTimelineAdapter = createEntityAdapter<TimelineQueryItem>({
  selectId: item => item.id
});

const { selectAll } = profileTimelineAdapter.getSelectors();

interface TimelineListParams extends PaginationArgs {
  id: number;
}

export function useInfiniteProfileTimelineByScoreQuery(
  params: TimelineListParams,
  fetchAll = false // if `true`: auto do next fetches to get all notes at once
) {
  const baseResult = useProfileTimelineQuery(params);

  const [trigger, nextResult] = useLazyProfileTimelineQuery();
  const [combinedData, setCombinedData] = useState(profileTimelineAdapter.getInitialState({}));

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
    next.current = baseResult.data?.profileTimeline?.pageInfo?.endCursor;
    if (baseResult?.data?.profileTimeline) {
      isBaseReady.current = true;

      const adapterSetAll = profileTimelineAdapter.setAll(
        combinedData,
        baseResult.data.profileTimeline.edges.map(item => item.node)
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
    totalCount: baseResult?.data?.profileTimeline?.totalCount ?? 0,
    error: baseResult?.error,
    isError: baseResult?.isError,
    isLoading: baseResult?.isLoading,
    isFetching: baseResult?.isFetching || nextResult?.isFetching,
    errorNext: nextResult?.error,
    isErrorNext: nextResult?.isError,
    isFetchingNext: nextResult?.isFetching,
    hasNext: !!baseResult.data?.profileTimeline?.pageInfo?.hasNextPage,
    fetchNext,
    refetch
  };
}
