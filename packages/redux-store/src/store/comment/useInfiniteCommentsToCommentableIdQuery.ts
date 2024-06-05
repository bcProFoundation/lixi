import { PaginationArgs } from '@bcpros/lixi-models/core/pagination/pagination.args';
import { Comment, CommentOrder, CommentQueryItem } from 'src/generated/index';
import { createEntityAdapter } from '@reduxjs/toolkit';
import { useCommentsToCommentableIdQuery, useLazyCommentsToCommentableIdQuery } from '@store/comment/comments.api';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface CommentsByCommentableIdParams extends PaginationArgs {
  orderBy: CommentOrder;
  id: string;
}

const commentsAdapter = createEntityAdapter<CommentQueryItem, string>({
  selectId: comment => comment.id,
  sortComparer: (a: Comment, b: Comment) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return dateA.getTime() - dateB.getTime();
  }
});
const { selectAll } = commentsAdapter.getSelectors();

export function useInfiniteCommentsToCommentableIdQuery(
  params: CommentsByCommentableIdParams,
  fetchAll = false // if `true`: auto do next fetches to get all notes at once
) {
  const baseResult = useCommentsToCommentableIdQuery(params);

  const [trigger, nextResult] = useLazyCommentsToCommentableIdQuery();
  const [combinedData, setCombinedData] = useState(commentsAdapter.getInitialState({}));

  const isBaseReady = useRef(false);
  const isNextDone = useRef(true);

  // next: starts with a null, fetching ended with an undefined cursor
  const next = useRef<null | string | undefined>(null);

  const data = useMemo(() => {
    const result = selectAll(combinedData);
    return result.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateA.getTime() - dateB.getTime();
    });
  }, [combinedData]);

  // Base result
  useEffect(() => {
    next.current = baseResult.data?.commentsToCommentableId?.pageInfo?.endCursor;
    if (baseResult?.data?.commentsToCommentableId) {
      isBaseReady.current = true;

      const adapterSetAll = commentsAdapter.setAll(
        combinedData,
        baseResult.data.commentsToCommentableId.edges.map(item => item.node)
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
      if (fetchAll && nextResult.data?.commentsToCommentableId?.pageInfo?.hasNextPage) {
        fetchNext();
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
    totalCount: baseResult?.data?.commentsToCommentableId?.totalCount ?? 0,
    error: baseResult?.error,
    isError: baseResult?.isError,
    isLoading: baseResult?.isLoading,
    isFetching: baseResult?.isFetching || nextResult?.isFetching,
    errorNext: nextResult?.error,
    isErrorNext: nextResult?.isError,
    isFetchingNext: nextResult?.isFetching,
    hasNext: !!baseResult.data?.commentsToCommentableId?.pageInfo?.endCursor,
    fetchNext,
    refetch
  };
}
