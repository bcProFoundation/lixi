import { EntityState } from '@reduxjs/toolkit';
import { PageInfo } from '@generated/types.generated';
import { api, BookmarkQuery } from './bookmark.generated';

export interface BookmarkApiState extends EntityState<BookmarkQuery['bookmark']> {
  pageInfo: PageInfo;
  totalCount: number;
}

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Bookmark'],
  endpoints: {
    Bookmark: {
      providesTags: (result, error, arg) => ['Bookmark']
    },
    BookmarkByAccountId: {
      providesTags: (result, error, arg) => ['Bookmark'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { accountId, bookmarkType, ...otherArgs } = queryArgs;
          return { accountId, bookmarkType };
        }
        return { queryArgs };
      },
      merge(currentCacheData, responseData) {
        currentCacheData.allBookmarkByAccountId.edges.push(...responseData.allBookmarkByAccountId.edges);
        currentCacheData.allBookmarkByAccountId.pageInfo = responseData.allBookmarkByAccountId.pageInfo;
        currentCacheData.allBookmarkByAccountId.totalCount = responseData.allBookmarkByAccountId.totalCount;
      }
    },
    CheckIfHasBookmarked: {
      providesTags: (result, error, arg) => ['Bookmark'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { bookmarkId, bookmarkType, ...otherArgs } = queryArgs;
          return { bookmarkId, bookmarkType };
        }
        return { queryArgs };
      }
    },
    CreateBookmark: {
      async onQueryStarted({ input }, { dispatch, queryFulfilled }) {
        const { bookmarkType } = input;
        try {
          const { data: result } = await queryFulfilled;
          const { id: accountId } = result.createBookmark.account;

          dispatch(
            api.util.updateQueryData(
              'CheckIfHasBookmarked',
              { bookmarkId: result.createBookmark.bookmarkId, bookmarkType },
              draft => {
                draft.checkIfHasBookmarked = true;
              }
            )
          );

          dispatch(
            api.util.updateQueryData('BookmarkByAccountId', { accountId: accountId, bookmarkType }, draft => {
              draft.allBookmarkByAccountId.edges.unshift({
                cursor: result.createBookmark.id,
                node: {
                  ...result.createBookmark
                }
              });
              draft.allBookmarkByAccountId.totalCount++;
            })
          );
        } catch (error) {
          console.log(error);
        }
      }
    },
    RemoveBookmark: {
      async onQueryStarted({ input }, { dispatch, queryFulfilled }) {
        const { id } = input;
        try {
          const { data: result } = await queryFulfilled;
          const { id: accountId } = result.removeBookmark.account;

          dispatch(
            api.util.updateQueryData(
              'CheckIfHasBookmarked',
              { bookmarkId: result.removeBookmark.bookmarkId, bookmarkType: result.removeBookmark.type },
              draft => {
                draft.checkIfHasBookmarked = false;
              }
            )
          );

          dispatch(
            api.util.updateQueryData(
              'BookmarkByAccountId',
              { accountId: accountId, bookmarkType: result.removeBookmark.type },
              draft => {
                const index = draft.allBookmarkByAccountId.edges.findIndex(edge => edge.node.id === id);
                draft.allBookmarkByAccountId.edges.splice(index, 1);
                draft.allBookmarkByAccountId.totalCount--;
              }
            )
          );
        } catch (error) {
          console.log(error);
        }
      }
    }
  }
});

export { enhancedApi as api };

export const {
  useBookmarkByAccountIdQuery,
  useBookmarkQuery,
  useCreateBookmarkMutation,
  useLazyBookmarkByAccountIdQuery,
  useRemoveBookmarkMutation,
  useLazyBookmarkQuery,
  useCheckIfHasBookmarkedQuery,
  useLazyCheckIfHasBookmarkedQuery
} = enhancedApi;
