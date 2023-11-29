import { PageInfo, Post } from '@generated/types.generated';
import { EntityState } from '@reduxjs/toolkit';

import { POST_TYPE } from '@bcpros/lixi-models/constants';
import { api as timelineApi } from '@store/timeline/timeline.api';
import { api } from './posts.generated';

export interface PostApiState extends EntityState<Post> {
  pageInfo: PageInfo;
  totalCount: number;
}

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Post', 'Posts', 'Timeline', 'CommentCreated'],
  endpoints: {
    PostsBySearch: {
      providesTags: (result, error, arg) => ['Posts'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { query, minBurnFilter, ...otherArgs } = queryArgs;
          return { query, minBurnFilter };
        }
        return { queryArgs };
      },
      merge(currentCacheData, responseData) {
        currentCacheData.allPostsBySearch.edges.push(...responseData.allPostsBySearch.edges);
        currentCacheData.allPostsBySearch.pageInfo = responseData.allPostsBySearch.pageInfo;
      }
    },
    PostsBySearchWithHashtag: {
      providesTags: (result, error, arg) => ['Posts'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { hashtags, query, minBurnFilter, ...otherArgs } = queryArgs;
          return { hashtags, query, minBurnFilter };
        }
        return { queryArgs };
      },
      merge(currentCacheData, responseData) {
        currentCacheData.allPostsBySearchWithHashtag.edges.push(...responseData.allPostsBySearchWithHashtag.edges);
        currentCacheData.allPostsBySearchWithHashtag.pageInfo = responseData.allPostsBySearchWithHashtag.pageInfo;
      }
    },
    PostsBySearchWithHashtagAtPage: {
      providesTags: (result, error, arg) => ['Posts'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { hashtags, query, minBurnFilter, pageId, ...otherArgs } = queryArgs;
          return { hashtags, query, minBurnFilter, pageId };
        }
        return { queryArgs };
      },
      merge(currentCacheData, responseData) {
        currentCacheData.allPostsBySearchWithHashtagAtPage.edges.push(
          ...responseData.allPostsBySearchWithHashtagAtPage.edges
        );
        currentCacheData.allPostsBySearchWithHashtagAtPage.pageInfo =
          responseData.allPostsBySearchWithHashtagAtPage.pageInfo;
      }
    },
    PostsBySearchWithHashtagAtToken: {
      providesTags: (result, error, arg) => ['Posts'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { hashtags, query, minBurnFilter, tokenId, ...otherArgs } = queryArgs;
          return { hashtags, query, minBurnFilter, tokenId };
        }
        return { queryArgs };
      },
      merge(currentCacheData, responseData) {
        currentCacheData.allPostsBySearchWithHashtagAtToken.edges.push(
          ...responseData.allPostsBySearchWithHashtagAtToken.edges
        );
        currentCacheData.allPostsBySearchWithHashtagAtToken.pageInfo =
          responseData.allPostsBySearchWithHashtagAtToken.pageInfo;
      }
    },
    PostsByPageId: {
      providesTags: (result, error, arg) => ['Posts', 'CommentCreated'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { id, minBurnFilter, accountId, ...otherArgs } = queryArgs;
          return { id, minBurnFilter, accountId };
        }
        return { queryArgs };
      },

      merge(currentCacheData, responseData) {
        currentCacheData.allPostsByPageId.edges.push(...responseData.allPostsByPageId.edges);
        currentCacheData.allPostsByPageId.pageInfo = responseData.allPostsByPageId.pageInfo;
        currentCacheData.allPostsByPageId.totalCount = responseData.allPostsByPageId.totalCount;
      }
    },
    PostsByTokenId: {
      providesTags: (result, error, arg) => ['Posts', 'CommentCreated'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { id, minBurnFilter, ...otherArgs } = queryArgs;
          return { id, minBurnFilter };
        }
        return { queryArgs };
      },

      merge(currentCacheData, responseData) {
        currentCacheData.allPostsByTokenId.edges.push(...responseData.allPostsByTokenId.edges);
        currentCacheData.allPostsByTokenId.pageInfo = responseData.allPostsByTokenId.pageInfo;
        currentCacheData.allPostsByTokenId.totalCount = responseData.allPostsByTokenId.totalCount;
      }
    },
    PostsByUserId: {
      providesTags: (result, error, arg) => ['Posts', 'CommentCreated'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { id, minBurnFilter, ...otherArgs } = queryArgs;
          return { id, minBurnFilter };
        }
        return { queryArgs };
      },

      merge(currentCacheData, responseData) {
        currentCacheData.allPostsByUserId.edges.push(...responseData.allPostsByUserId.edges);
        currentCacheData.allPostsByUserId.pageInfo = responseData.allPostsByUserId.pageInfo;
        currentCacheData.allPostsByUserId.totalCount = responseData.allPostsByUserId.totalCount;
      }
    },
    Post: {
      providesTags: (result, error, arg) => ['Post', { type: 'Post', id: arg.id }, 'CommentCreated']
    },
    PostsByHashtagId: {
      providesTags: (result, error, arg) => ['Posts'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { id, ...otherArgs } = queryArgs;
          return { id };
        }
        return { queryArgs };
      },

      merge(currentCacheData, responseData) {
        currentCacheData.allPostsByHashtagId.edges.push(...responseData.allPostsByHashtagId.edges);
        currentCacheData.allPostsByHashtagId.pageInfo = responseData.allPostsByHashtagId.pageInfo;
        currentCacheData.allPostsByHashtagId.totalCount = responseData.allPostsByHashtagId.totalCount;
      }
    },

    createPost: {
      async onQueryStarted({ input }, { dispatch, getState, queryFulfilled }) {
        const { extraArguments, pageId, tokenPrimaryId } = input;
        const { hashtagId, hashtags, minBurnFilter, orderBy, query } = extraArguments;

        try {
          const { data: result } = await queryFulfilled;

          const timelineInvalidatedBy = timelineApi.util.selectInvalidatedBy(getState(), ['Timeline']);
          for (const invalidatedBy of timelineInvalidatedBy) {
            const { endpointName, originalArgs } = invalidatedBy;
            dispatch(
              timelineApi.util.updateQueryData(endpointName as any, originalArgs, draft => {
                const fields = Object.keys(draft);
                for (const field of fields) {
                  if (!draft[field]) continue;

                  const timelineId = `${POST_TYPE.POST}:${result.createPost.id}`;
                  draft[field].edges.unshift({
                    cursor: timelineId,
                    node: {
                      id: timelineId,
                      data: {
                        __typename: 'Post',
                        ...result.createPost
                      }
                    }
                  });
                  draft[field].totalCount = draft[field].totalCount + 1;
                }
              })
            );
          }

          const postsInvalidatedBy = enhancedApi.util.selectInvalidatedBy(getState(), ['Posts']);
          for (const invalidatedBy of postsInvalidatedBy) {
            const { endpointName, originalArgs } = invalidatedBy;
            dispatch(
              enhancedApi.util.updateQueryData(endpointName as any, originalArgs, draft => {
                const fields = Object.keys(draft);
                for (const field of fields) {
                  if (!draft[field]) continue;

                  draft[field].edges.unshift({
                    cursor: result.createPost.id,
                    node: {
                      ...result.createPost
                    }
                  });
                  draft[field].totalCount = draft[field].totalCount + 1;
                }
              })
            );
          }
        } catch {}
      }
    },
    updatePost: {
      async onQueryStarted({ input }, { dispatch, queryFulfilled }) {
        const { extraArguments } = input;
        const { minBurnFilter } = extraArguments;
        try {
          const { data: result } = await queryFulfilled;
        } catch {}
      }
    },
    repost: {}
  }
});

export { enhancedApi as api };

export const {
  usePostQuery,
  useLazyPostQuery,
  usePostsByPageIdQuery,
  useLazyPostsByPageIdQuery,
  usePostsByTokenIdQuery,
  useLazyPostsByTokenIdQuery,
  usePostsByUserIdQuery,
  useLazyPostsByUserIdQuery,
  usePostsBySearchQuery,
  useLazyPostsBySearchQuery,
  usePostsBySearchWithHashtagQuery,
  useLazyPostsBySearchWithHashtagQuery,
  usePostsBySearchWithHashtagAtPageQuery,
  useLazyPostsBySearchWithHashtagAtPageQuery,
  useLazyPostsByHashtagIdQuery,
  usePostsByHashtagIdQuery,
  useLazyPostsBySearchWithHashtagAtTokenQuery,
  usePostsBySearchWithHashtagAtTokenQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useRepostMutation
} = enhancedApi;
