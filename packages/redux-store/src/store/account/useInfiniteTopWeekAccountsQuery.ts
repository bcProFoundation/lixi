import { PaginationArgs } from '@bcpros/lixi-models';
import { AccountQueryItem } from '@generated/index';
import { createEntityAdapter } from '@reduxjs/toolkit';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTopWeekAccountsQuery, useLazyTopWeekAccountsQuery } from './accounts.api';

const accountsAdapter = createEntityAdapter<AccountQueryItem>({
  selectId: account => account.id
});

const { selectAll } = accountsAdapter.getSelectors();

export function useInfiniteTopWeekAccountsQuery(
  params: PaginationArgs,
  fetchAll: boolean = false // if `true`: auto do next fetches to get all notes at once
) {
  const baseResult = useTopWeekAccountsQuery(params);

  const [trigger, nextResult] = useLazyTopWeekAccountsQuery();
  const [combinedData, setCombinedData] = useState(accountsAdapter.getInitialState({}));

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
    next.current = baseResult.data?.topWeekAccountDanaGiven?.pageInfo?.endCursor;
    if (baseResult?.data?.topWeekAccountDanaGiven) {
      isBaseReady.current = true;

      const adapterSetAll = accountsAdapter.setAll(
        combinedData,
        baseResult.data.topWeekAccountDanaGiven.edges.map(item => item.node)
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
    totalCount: baseResult?.data?.topWeekAccountDanaGiven?.totalCount ?? 0,
    error: baseResult?.error,
    isError: baseResult?.isError,
    isLoading: baseResult?.isLoading,
    isFetching: baseResult?.isFetching || nextResult?.isFetching,
    errorNext: nextResult?.error,
    isErrorNext: nextResult?.isError,
    isFetchingNext: nextResult?.isFetching,
    hasNext: !!baseResult.data?.topWeekAccountDanaGiven?.pageInfo?.hasNextPage,
    fetchNext,
    refetch
  };
}
