import { PaginationArgs } from '@bcpros/lixi-models/core/pagination/pagination.args';
import { TimelineQueryItem } from '../../generated/types';
import { createEntityAdapter } from '@reduxjs/toolkit';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useBookmarkTimelineQuery, useLazyBookmarkTimelineQuery } from './bookmark.api';

const bookmarksAdapter = createEntityAdapter<TimelineQueryItem, string>({
  selectId: item => item.id
});

const { selectAll } = bookmarksAdapter.getSelectors();

export interface BookmarkListByUserId extends PaginationArgs {
  id: number;
}

export function useInfiniteBookmarkTimelineQuery(
  params: BookmarkListByUserId,
  fetchAll = false // if `true`: auto do next fetches to get all notes at once
) {
  const baseResult = useBookmarkTimelineQuery(params, {
    skip: !params.id
  });

  const [trigger, nextResult, lastPromiseInfo] = useLazyBookmarkTimelineQuery();
  const [combinedData, setCombinedData] = useState(bookmarksAdapter.getInitialState({}));

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
    next.current = baseResult.data?.bookmarkTimeline?.pageInfo?.endCursor;
    if (baseResult?.data?.bookmarkTimeline) {
      isBaseReady.current = true;

      const adapterSetAll = bookmarksAdapter.setAll(
        combinedData,
        baseResult.data.bookmarkTimeline.edges.map(item => item.node)
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
    totalCount: baseResult?.data?.bookmarkTimeline?.totalCount ?? 0,
    error: baseResult?.error,
    isError: baseResult?.isError,
    isLoading: baseResult?.isLoading,
    isFetching: baseResult?.isFetching || nextResult?.isFetching,
    errorNext: nextResult?.error,
    isErrorNext: nextResult?.isError,
    isFetchingNext: nextResult?.isFetching,
    hasNext: !!baseResult.data?.bookmarkTimeline?.pageInfo?.endCursor,
    fetchNext,
    refetch
  };
}
