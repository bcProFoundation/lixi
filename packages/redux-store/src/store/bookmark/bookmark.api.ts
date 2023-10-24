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
  }
});

export { enhancedApi as api };

export const {
  useBookmarkQuery,
  useCreateBookmarkMutation,
  useRemoveBookmarkMutation,
  useLazyBookmarkQuery,
} = enhancedApi;
