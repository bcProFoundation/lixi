import { PaginationArgs } from '@bcpros/lixi-models';
import { AccountQueryItem } from '@generated/index';
import { createEntityAdapter } from '@reduxjs/toolkit';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAccountsQuery, useLazyAccountsQuery } from './accounts.api';

const accountsAdapter = createEntityAdapter<AccountQueryItem, number>({
  selectId: account => account.id
});

const { selectAll } = accountsAdapter.getSelectors();

export function useInfiniteAccountsQuery(
  params: PaginationArgs,
  fetchAll: boolean = false // if `true`: auto do next fetches to get all notes at once
) {
  const baseResult = useAccountsQuery(params);

  const [trigger, nextResult] = useLazyAccountsQuery();
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
    next.current = baseResult.data?.allAccounts?.pageInfo?.endCursor;
    if (baseResult?.data?.allAccounts) {
      isBaseReady.current = true;

      const adapterSetAll = accountsAdapter.setAll(
        combinedData,
        baseResult.data.allAccounts.edges.map(item => item.node)
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
    totalCount: baseResult?.data?.allAccounts?.totalCount ?? 0,
    error: baseResult?.error,
    isError: baseResult?.isError,
    isLoading: baseResult?.isLoading,
    isFetching: baseResult?.isFetching || nextResult?.isFetching,
    errorNext: nextResult?.error,
    isErrorNext: nextResult?.isError,
    isFetchingNext: nextResult?.isFetching,
    hasNext: !!baseResult.data?.allAccounts?.pageInfo?.hasNextPage,
    fetchNext,
    refetch
  };
}
