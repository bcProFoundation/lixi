import { createEntityAdapter } from '@reduxjs/toolkit';
import { useEffect, useMemo, useRef, useState } from 'react';

import { TimelineQueryItem } from '../../../generated/types';
import {
  useOfferByFilterDatabaseQuery,
  useLazyAllOfferByAccountQuery,
  useLazyOfferByFilterDatabaseQuery
} from './offer.api';
import { BasicPaginationArgs } from '@bcpros/lixi-models/core/pagination/basic.pagination.args';
import { OfferFilterInput } from '../../../generated/types.generated';

const offerTimelineAdapter = createEntityAdapter<TimelineQueryItem, string>({
  selectId: item => item.id
});

const { selectAll } = offerTimelineAdapter.getSelectors();

type FilterOfferType = BasicPaginationArgs & {
  offerFilterInput: OfferFilterInput;
};

export function useInfiniteOfferFilterDatabaseQuery(
  params: FilterOfferType,
  fetchAll = false // if `true`: auto do next fetches to get all notes at once
) {
  const { countryCode, adminCode, cityName, paymentMethodIds, coin, fiatCurrency, isBuyOffer, paymentApp } =
    params.offerFilterInput;
  const baseResult = useOfferByFilterDatabaseQuery(params, {
    skip:
      !countryCode &&
      !adminCode &&
      !cityName &&
      !coin &&
      !fiatCurrency &&
      !isBuyOffer &&
      !paymentApp &&
      (paymentMethodIds?.length ?? 0) === 0
  });

  const [trigger, nextResult] = useLazyOfferByFilterDatabaseQuery();
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
    next.current = baseResult.data?.offerByFilterDatabase?.pageInfo?.endCursor;
    if (baseResult?.data?.offerByFilterDatabase) {
      isBaseReady.current = true;

      const adapterSetAll = offerTimelineAdapter.setAll(
        combinedData,
        baseResult.data?.offerByFilterDatabase.edges.map(item => item.node)
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
    totalCount: baseResult?.data?.offerByFilterDatabase.totalCount ?? 0,
    error: baseResult?.error,
    isError: baseResult?.isError,
    isLoading: baseResult?.isLoading,
    isFetching: baseResult?.isFetching || nextResult?.isFetching,
    errorNext: nextResult?.error,
    isErrorNext: nextResult?.isError,
    isFetchingNext: nextResult?.isFetching,
    hasNext: !!baseResult.data?.offerByFilterDatabase?.pageInfo?.hasNextPage,
    fetchNext,
    refetch
  };
}
