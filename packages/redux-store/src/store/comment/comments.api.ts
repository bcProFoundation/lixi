import { Comment, PageInfo } from 'src/generated/types.generated';
import { EntityState } from '@reduxjs/toolkit';

import { api } from './comments.generated';

export interface CommentApiState extends EntityState<Comment, string> {
  pageInfo: PageInfo;
  totalCount: number;
}

const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Comment', 'Comments', 'CommentCreated'],
  endpoints: {
    CommentsToCommentableId: {
      providesTags: ['Comments', 'CommentCreated'],
      serializeQueryArgs({ queryArgs }) {
        if (queryArgs) {
          const { orderBy, id, ...otherArgs } = queryArgs;
          return { orderBy, id };
        }
        return { queryArgs };
      },
      merge(currentCacheData, responseData) {
        currentCacheData.commentsToCommentableId.edges.push(...responseData.commentsToCommentableId.edges);
        currentCacheData.commentsToCommentableId.pageInfo = responseData.commentsToCommentableId.pageInfo;
        currentCacheData.commentsToCommentableId.totalCount = responseData.commentsToCommentableId.totalCount;
      }
    },
    createComment: {}
  }
});

export { enhancedApi as api };

export const {
  useCommentQuery,
  useCommentsToCommentableIdQuery,
  useLazyCommentsToCommentableIdQuery,
  useCreateCommentMutation,
  useCreateReplyCommentMutation
} = enhancedApi;
