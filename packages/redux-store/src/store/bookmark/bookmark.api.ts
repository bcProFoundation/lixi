import { POST_TYPE } from '@bcpros/lixi-models/constants';
import { changeBookmarkActionSheet } from '@store/post/actions';
import { api as postsApi } from '../post/posts.api';
import { api } from './bookmark.generated';



const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Bookmark', 'BookmarkTimeline'],
  endpoints: {
    Bookmark: {
      providesTags: (result, error, arg) => ['Bookmark']
    },
    BookmarkTimeline: {
      providesTags: (result, error, arg) => ['BookmarkTimeline'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { id, ...otherArgs } = queryArgs;
          return { id };
        }
        return { queryArgs };
      },
      merge(currentCacheData, responseData) {
        currentCacheData.bookmarkTimeline.edges.push(...responseData.bookmarkTimeline.edges);
        currentCacheData.bookmarkTimeline.pageInfo = responseData.bookmarkTimeline.pageInfo;
      }
    },

    CreateBookmark: {
      async onQueryStarted({ input }, { dispatch, getState, queryFulfilled }) {
        const { accountId, bookmarkForId } = input;

        try {
          const postBookmarked = await dispatch(postsApi.endpoints.Post.initiate({ id: bookmarkForId }));

          const bookmarkTimelineInvalidatedBy = enhancedApi.util.selectInvalidatedBy(getState(), ['BookmarkTimeline']);
          for (const invalidatedBy of bookmarkTimelineInvalidatedBy) {
            const { endpointName, originalArgs } = invalidatedBy;
            dispatch(
              enhancedApi.util.updateQueryData(endpointName as any, originalArgs, draft => {
                const fields = Object.keys(draft);
                for (const field of fields) {
                  if (!draft[field]) continue;

                  const timelineId = `${POST_TYPE.POST}:${postBookmarked.data.post.id}`;
                  draft[field].edges.unshift({
                    cursor: timelineId,
                    node: {
                      id: timelineId,
                      data: {
                        __typename: 'Post',
                        ...postBookmarked.data.post
                      }
                    }
                  });
                  draft[field].totalCount = draft[field].totalCount + 1;
                }
              })
            );
          }
          dispatch(changeBookmarkActionSheet(bookmarkForId));
        } catch (error) {
          console.log('Error in bookmark.api: ', error);
        }
      }
    },
    RemoveBookmark: {
      async onQueryStarted({ input }, { dispatch, getState, queryFulfilled }) {
        const { bookmarkForId } = input;

        try {
          const bookmarkTimelineInvalidatedBy = enhancedApi.util.selectInvalidatedBy(getState(), ['BookmarkTimeline']);
          for (const invalidatedBy of bookmarkTimelineInvalidatedBy) {
            const { endpointName, originalArgs } = invalidatedBy;
            dispatch(
              enhancedApi.util.updateQueryData(endpointName as any, originalArgs, draft => {
                const fields = Object.keys(draft);
                for (const field of fields) {
                  if (!draft[field]) continue;

                  const indexToUpdate = draft[field].edges.findIndex(
                    item => item.cursor === `${POST_TYPE.POST}:${bookmarkForId}`
                  );

                  if (indexToUpdate != -1) {
                    draft[field].edges.splice(indexToUpdate, 1);
                    draft[field].totalCount = draft[field].totalCount - 1;
                  }
                }
              })
            );
          }

          dispatch(changeBookmarkActionSheet(bookmarkForId));
        } catch (error) {
          console.log('Error in bookmark.api: ', error);
        }
      }
    }
  }
});

export { enhancedApi as api };

export const {
  useBookmarkQuery,
  useCreateBookmarkMutation,
  useRemoveBookmarkMutation,
  useLazyBookmarkQuery,
  useBookmarkTimelineQuery,
  useLazyBookmarkTimelineQuery
} = enhancedApi;
