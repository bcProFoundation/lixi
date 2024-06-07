import { PaginationArgs } from '@bcpros/lixi-models/core/pagination/pagination.args';
import { createEntityAdapter } from '@reduxjs/toolkit';
import { useEffect, useMemo, useRef, useState } from 'react';

import { TimelineQueryItem } from '../../generated/types';
import { useLazyProfileTimelineByTimeQuery, useProfileTimelineByTimeQuery } from './timeline.api';

const profileTimelineAdapter = createEntityAdapter<TimelineQueryItem, string>({
  selectId: item => item.id
});

const { selectAll } = profileTimelineAdapter.getSelectors();

interface ProfileTimelineByTimeListParams extends PaginationArgs {
  id: number;
  minimumDanaFilter: number;
}

export function useInfiniteProfileTimelineByTimeQuery(
  params: ProfileTimelineByTimeListParams,
  fetchAll = false // if `true`: auto do next fetches to get all notes at once
) {
  const baseResult = useProfileTimelineByTimeQuery(params);

  const [trigger, nextResult] = useLazyProfileTimelineByTimeQuery();
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
    next.current = baseResult.data?.profileTimelineByTime?.pageInfo?.endCursor;
    if (baseResult?.data?.profileTimelineByTime) {
      isBaseReady.current = true;

      const adapterSetAll = profileTimelineAdapter.setAll(
        combinedData,
        baseResult.data.profileTimelineByTime.edges.map(item => item.node)
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
    totalCount: baseResult?.data?.profileTimelineByTime?.totalCount ?? 0,
    error: baseResult?.error,
    isError: baseResult?.isError,
    isLoading: baseResult?.isLoading,
    isFetching: baseResult?.isFetching || nextResult?.isFetching,
    errorNext: nextResult?.error,
    isErrorNext: nextResult?.isError,
    isFetchingNext: nextResult?.isFetching,
    hasNext: !!baseResult.data?.profileTimelineByTime?.pageInfo?.hasNextPage,
    fetchNext,
    refetch
  };
}
