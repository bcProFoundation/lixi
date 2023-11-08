import { PaginationArgs } from '@bcpros/lixi-models';
import { createEntityAdapter } from '@reduxjs/toolkit';
import { useAppDispatch } from '@store/hooks';
import { useLazyPostsByPageIdQuery } from '@store/post/posts.generated';
import _ from 'lodash';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Post, PostOrder, ProductOrder } from '@generated/types.generated';

import { ProductQuery, useProductsQuery, useLazyProductsByPageIdQuery } from '@store/product/products.generated';

import { useProductsByPageIdQuery } from '@store/product/products.api';

const productsAdapter = createEntityAdapter<ProductQuery['product']>({
  selectId: product => product.id,
  sortComparer: (a, b) => b.createdAt - a.createdAt
});

const { selectAll, selectEntities, selectIds, selectTotal } = productsAdapter.getSelectors();

export interface ProductListByIdParams extends PaginationArgs {
  orderBy?: ProductOrder;
  id: string;
  accountId?: number;
}

export function useInfiniteProductsByPageIdQuery(
  params: ProductListByIdParams,
  fetchAll = false // if `true`: auto do next fetches to get all notes at once
) {
  const dispatch = useAppDispatch();
  const baseResult = useProductsByPageIdQuery(params);

  const [trigger, nextResult, lastPromiseInfo] = useLazyProductsByPageIdQuery();
  const [combinedData, setCombinedData] = useState(productsAdapter.getInitialState({}));

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
    next.current = baseResult.data?.allProductsByPageId?.pageInfo?.endCursor;
    if (baseResult?.data?.allProductsByPageId) {
      isBaseReady.current = true;

      const baseResultParse = baseResult.data.allProductsByPageId.edges.map(item => item.node);
      const adapterSetAll = productsAdapter.setAll(
        combinedData,
        baseResult.data.allProductsByPageId.edges.map(item => item.node)
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
    totalCount: baseResult?.data?.allProductsByPageId?.totalCount ?? 0,
    error: baseResult?.error,
    isError: baseResult?.isError,
    isLoading: baseResult?.isLoading,
    isFetching: baseResult?.isFetching || nextResult?.isFetching,
    errorNext: nextResult?.error,
    isErrorNext: nextResult?.isError,
    isFetchingNext: nextResult?.isFetching,
    hasNext: !!baseResult.data?.allProductsByPageId?.pageInfo?.endCursor,
    fetchNext,
    refetch
  };
}
