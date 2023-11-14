import { createAction } from '@reduxjs/toolkit';
import { CreateCommentMutation } from './comments.generated';

export const createCommentSuccess = createAction<CreateCommentMutation>('comment/createCommentSuccess');
export const createCommentFailure = createAction<string>('comment/createCommentFailure');
