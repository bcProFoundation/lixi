import { BasicPaginationArgs } from '@bcpros/lixi-models';
import { TokenQueryItem } from '@generated/index';
import { createEntityAdapter } from '@reduxjs/toolkit';
import { useLazyTokensQuery, useTokensQuery } from '@store/token/tokens.api';
import { useEffect, useMemo, useRef, useState } from 'react';

const tokensAdapter = createEntityAdapter<TokenQueryItem, string>({
  selectId: token => token.id
});

const { selectAll } = tokensAdapter.getSelectors();

export function useInfiniteTokensQuery(
  params: BasicPaginationArgs,
  fetchAll: boolean = false // if `true`: auto do next fetches to get all notes at once
) {
  const baseResult = useTokensQuery(params);

  const [trigger, nextResult] = useLazyTokensQuery();
  const [combinedData, setCombinedData] = useState(tokensAdapter.getInitialState({}));

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
    next.current = baseResult.data?.allTokens?.pageInfo?.endCursor;
    if (baseResult?.data?.allTokens) {
      isBaseReady.current = true;

      const adapterSetAll = tokensAdapter.setAll(
        combinedData,
        baseResult.data.allTokens.edges.map(item => item.node)
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
      if (fetchAll && nextResult.data?.allTokens?.pageInfo?.hasNextPage) {
        fetchAll && fetchNext();
      }
    }
  };

  const refetch = async () => {
    isBaseReady.current = false;
    next.current = null; // restart
    await baseResult.refetch(); // restart with a whole new refetching
  };

  return {
    data: data ?? [],
    totalCount: baseResult?.data?.allTokens?.totalCount ?? 0,
    error: baseResult?.error,
    isError: baseResult?.isError,
    isLoading: baseResult?.isLoading,
    isFetching: baseResult?.isFetching || nextResult?.isFetching,
    errorNext: nextResult?.error,
    isErrorNext: nextResult?.isError,
    isFetchingNext: nextResult?.isFetching,
    hasNext: !!baseResult.data?.allTokens?.pageInfo?.hasNextPage,
    fetchNext,
    refetch
  };
}
