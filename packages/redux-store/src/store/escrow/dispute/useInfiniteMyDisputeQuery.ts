import { createEntityAdapter } from '@reduxjs/toolkit';
import { useEffect, useMemo, useRef, useState } from 'react';

import { TimelineQueryItem } from '../../../generated/types';
import { useAllDisputeByAccountQuery, useLazyAllDisputeByAccountQuery } from './dispute.api';
import { BasicPaginationArgs } from '@bcpros/lixi-models/core/pagination/basic.pagination.args';
import { DisputeStatus } from '../../../generated/types.generated';

const disputeTimelineAdapter = createEntityAdapter<TimelineQueryItem, string>({
  selectId: item => item.id
});

const { selectAll } = disputeTimelineAdapter.getSelectors();

type MyDisputeType = BasicPaginationArgs & {
  disputeStatus: DisputeStatus;
};

export function useInfiniteMyDisputeQuery(
  params: MyDisputeType,
  fetchAll = false // if `true`: auto do next fetches to get all notes at once
) {
  const baseResult = useAllDisputeByAccountQuery(params, { skip: !params.disputeStatus });

  const [trigger, nextResult] = useLazyAllDisputeByAccountQuery();
  const [combinedData, setCombinedData] = useState(disputeTimelineAdapter.getInitialState({}));

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
    next.current = baseResult.data?.allDisputeByAccount?.pageInfo?.endCursor;
    if (baseResult?.data?.allDisputeByAccount) {
      isBaseReady.current = true;

      const adapterSetAll = disputeTimelineAdapter.setAll(
        combinedData,
        baseResult.data?.allDisputeByAccount.edges.map(item => item.node)
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
    totalCount: baseResult?.data?.allDisputeByAccount.totalCount ?? 0,
    error: baseResult?.error,
    isError: baseResult?.isError,
    isLoading: baseResult?.isLoading,
    isFetching: baseResult?.isFetching || nextResult?.isFetching,
    errorNext: nextResult?.error,
    isErrorNext: nextResult?.isError,
    isFetchingNext: nextResult?.isFetching,
    hasNext: !!baseResult.data?.allDisputeByAccount?.pageInfo?.hasNextPage,
    fetchNext,
    refetch
  };
}
