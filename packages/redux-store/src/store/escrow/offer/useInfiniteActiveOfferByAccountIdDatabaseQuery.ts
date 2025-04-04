import { createEntityAdapter } from '@reduxjs/toolkit';
import { useEffect, useMemo, useRef, useState } from 'react';

import { TimelineQueryItem } from '../../../generated/types';
import { useAllOfferActiveByAccountIdDatabaseQuery, useLazyAllOfferActiveByAccountIdDatabaseQuery } from './offer.api';
import { BasicPaginationArgs } from '@bcpros/lixi-models/core/pagination/basic.pagination.args';

const offerTimelineAdapter = createEntityAdapter<TimelineQueryItem, string>({
  selectId: item => item.id
});

const { selectAll } = offerTimelineAdapter.getSelectors();

type ActiveOfferByAccountIdType = BasicPaginationArgs & {
  accountId: number;
};

export function useInfiniteActiveOfferByAccountIdDatabaseQuery(
  params: ActiveOfferByAccountIdType,
  fetchAll = false // if `true`: auto do next fetches to get all notes at once
) {
  const baseResult = useAllOfferActiveByAccountIdDatabaseQuery(params, { skip: !params.accountId });

  const [trigger, nextResult] = useLazyAllOfferActiveByAccountIdDatabaseQuery();
  const [combinedData, setCombinedData] = useState(offerTimelineAdapter.getInitialState({}));

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
    next.current = baseResult.data?.allOfferActiveByAccountIdDatabase?.pageInfo?.endCursor;
    if (baseResult?.data?.allOfferActiveByAccountIdDatabase) {
      isBaseReady.current = true;

      const adapterSetAll = offerTimelineAdapter.setAll(
        combinedData,
        baseResult.data?.allOfferActiveByAccountIdDatabase.edges.map(item => item.node)
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
    totalCount: baseResult?.data?.allOfferActiveByAccountIdDatabase.totalCount ?? 0,
    error: baseResult?.error,
    isError: baseResult?.isError,
    isLoading: baseResult?.isLoading,
    isFetching: baseResult?.isFetching || nextResult?.isFetching,
    errorNext: nextResult?.error,
    isErrorNext: nextResult?.isError,
    isFetchingNext: nextResult?.isFetching,
    hasNext: !!baseResult.data?.allOfferActiveByAccountIdDatabase?.pageInfo?.hasNextPage,
    fetchNext,
    refetch
  };
}
