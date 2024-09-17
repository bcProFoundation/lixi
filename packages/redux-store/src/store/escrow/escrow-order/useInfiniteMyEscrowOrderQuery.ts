import { createEntityAdapter } from '@reduxjs/toolkit';
import { useEffect, useMemo, useRef, useState } from 'react';

import { TimelineQueryItem } from '../../../generated/types';
import { useAllEscrowOrderByAccountQuery, useLazyAllEscrowOrderByAccountQuery } from './escrow-order.api';
import { BasicPaginationArgs } from '@bcpros/lixi-models/core/pagination/basic.pagination.args';
import { EscrowOrderStatus } from '../../../generated/types.generated';

const escrowOrderTimelineAdapter = createEntityAdapter<TimelineQueryItem, string>({
  selectId: item => item.id
});

const { selectAll } = escrowOrderTimelineAdapter.getSelectors();

type MyEscrowOrderType = BasicPaginationArgs & {
  escrowOrderStatus: EscrowOrderStatus;
};

export function useInfiniteMyEscrowOrderQuery(
  params: MyEscrowOrderType,
  fetchAll = false // if `true`: auto do next fetches to get all notes at once
) {
  const baseResult = useAllEscrowOrderByAccountQuery(params, { skip: !params.escrowOrderStatus });

  const [trigger, nextResult] = useLazyAllEscrowOrderByAccountQuery();
  const [combinedData, setCombinedData] = useState(escrowOrderTimelineAdapter.getInitialState({}));

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
    next.current = baseResult.data?.allEscrowOrderByAccount?.pageInfo?.endCursor;
    if (baseResult?.data?.allEscrowOrderByAccount) {
      isBaseReady.current = true;

      const adapterSetAll = escrowOrderTimelineAdapter.setAll(
        combinedData,
        baseResult.data?.allEscrowOrderByAccount.edges.map(item => item.node)
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
    totalCount: baseResult?.data?.allEscrowOrderByAccount.totalCount ?? 0,
    error: baseResult?.error,
    isError: baseResult?.isError,
    isLoading: baseResult?.isLoading,
    isFetching: baseResult?.isFetching || nextResult?.isFetching,
    errorNext: nextResult?.error,
    isErrorNext: nextResult?.isError,
    isFetchingNext: nextResult?.isFetching,
    hasNext: !!baseResult.data?.allEscrowOrderByAccount?.pageInfo?.hasNextPage,
    fetchNext,
    refetch
  };
}
