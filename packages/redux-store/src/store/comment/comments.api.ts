import { Comment, PageInfo } from '@generated/types.generated';
import { EntityState } from '@reduxjs/toolkit';

import { api } from './comments.generated';

export interface CommentApiState extends EntityState<Comment> {
  pageInfo: PageInfo;
  totalCount: number;
}

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Comment', 'Comments'],
  endpoints: {
    CommentsToPostId: {
      providesTags: ['Comments'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { orderBy, id, ...otherArgs } = queryArgs;
          return { orderBy, id };
        }
        return { queryArgs };
      },
      merge(currentCacheData, responseData) {
        currentCacheData.allCommentsToPostId.edges.push(...responseData.allCommentsToPostId.edges);
        currentCacheData.allCommentsToPostId.pageInfo = responseData.allCommentsToPostId.pageInfo;
        currentCacheData.allCommentsToPostId.totalCount = responseData.allCommentsToPostId.totalCount;
      }
    },
    createComment: {}
  }
});

export { enhancedApi as api };

export const { useCommentQuery, useCommentsToPostIdQuery, useLazyCommentsToPostIdQuery, useCreateCommentMutation } =
  enhancedApi;
