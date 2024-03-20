import { createAction } from '@reduxjs/toolkit';
import { CreateCommentMutation, CreateReplyCommentMutation } from './comments.generated';

export const createCommentSuccess = createAction<{
  dataCreateComment?: CreateCommentMutation;
  dataCreateReplyComment?: CreateReplyCommentMutation;
  isReplyComment: boolean;
}>('comment/createCommentSuccess');
export const createCommentFailure = createAction<string>('comment/createCommentFailure');
