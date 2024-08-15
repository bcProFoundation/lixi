import { createEntityAdapter } from '@reduxjs/toolkit';
import { useEffect, useMemo, useRef, useState } from 'react';

import { TimelineQueryItem } from '../../generated/types';
import { useAllOfferByAccountQuery, useLazyAllOfferByAccountQuery } from './offer.api';
import { BasicPaginationArgs } from '@bcpros/lixi-models';
import { OfferStatus } from '../../generated/types.generated';

const offerTimelineAdapter = createEntityAdapter<TimelineQueryItem, string>({
  selectId: item => item.id
});

const { selectAll } = offerTimelineAdapter.getSelectors();

interface MyOfferType extends BasicPaginationArgs {
  offerStatus: OfferStatus;
}

export function useInfiniteMyOffersQuery(
  params: MyOfferType,
  fetchAll = false // if `true`: auto do next fetches to get all notes at once
) {
  const baseResult = useAllOfferByAccountQuery(params, { skip: !params.offerStatus });

  const [trigger, nextResult] = useLazyAllOfferByAccountQuery();
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
    next.current = baseResult.data?.allOfferByAccount?.pageInfo?.endCursor;
    if (baseResult?.data?.allOfferByAccount) {
      isBaseReady.current = true;

      const adapterSetAll = offerTimelineAdapter.setAll(
        combinedData,
        baseResult.data?.allOfferByAccount.edges.map(item => item.node)
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
    totalCount: baseResult?.data?.allOfferByAccount.totalCount ?? 0,
    error: baseResult?.error,
    isError: baseResult?.isError,
    isLoading: baseResult?.isLoading,
    isFetching: baseResult?.isFetching || nextResult?.isFetching,
    errorNext: nextResult?.error,
    isErrorNext: nextResult?.isError,
    isFetchingNext: nextResult?.isFetching,
    hasNext: !!baseResult.data?.allOfferByAccount?.pageInfo?.hasNextPage,
    fetchNext,
    refetch
  };
}
