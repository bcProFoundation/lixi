import { PaginationArgs } from '@bcpros/lixi-models';
import { PostQueryItem } from '@generated/index';
import { createEntityAdapter } from '@reduxjs/toolkit';
import { useLazyPostsBySearchQuery, usePostsBySearchQuery } from '@store/post/posts.generated';
import { useEffect, useMemo, useRef, useState } from 'react';

const postsAdapter = createEntityAdapter<PostQueryItem>({
  selectId: post => post.id,
  sortComparer: (a, b) => b.createdAt - a.createdAt
});

const { selectAll, selectEntities, selectIds, selectTotal } = postsAdapter.getSelectors();

interface PostListParams extends PaginationArgs {
  query: string;
}

export function useInfinitePostsBySearchQuery(
  params: PostListParams,
  fetchAll = false // if `true`: auto do next fetches to get all notes at once
) {
  const baseResult = usePostsBySearchQuery(params, { skip: params.query === null });

  const [trigger, nextResult, lastPromiseInfo] = useLazyPostsBySearchQuery();
  const [combinedData, setCombinedData] = useState(postsAdapter.getInitialState({}));

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
    next.current = baseResult.data?.allPostsBySearch?.pageInfo?.endCursor;
    if (baseResult?.data?.allPostsBySearch) {
      isBaseReady.current = true;

      const a: PostQueryItem[] = baseResult.data.allPostsBySearch.edges.map(item => item.node);

      const adapterSetAll = postsAdapter.setAll(
        combinedData,
        baseResult.data.allPostsBySearch.edges.map(item => item.node)
      );

      setCombinedData(adapterSetAll);
      fetchAll && fetchNextQuery();
    }
  }, [baseResult]);

  const fetchNextQuery = async () => {
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
      fetchAll && fetchNextQuery();
    }
  };

  const refetchQuery = async () => {
    isBaseReady.current = false;
    next.current = null; // restart
    await baseResult.refetch(); // restart with a whole new refetching
  };

  return {
    queryData: data ?? [],
    queryError: baseResult?.error,
    isQueryError: baseResult?.isError,
    isQueryLoading: baseResult?.isLoading,
    isQueryFetching: baseResult?.isFetching || nextResult?.isFetching,
    errorQueryNext: nextResult?.error,
    isErrorQueryNext: nextResult?.isError,
    isFetchingQueryNext: nextResult?.isFetching,
    hasNextQuery: !!baseResult.data?.allPostsBySearch?.pageInfo?.endCursor,
    fetchNextQuery,
    refetchQuery
  };
}
