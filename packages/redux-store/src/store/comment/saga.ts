import { CommentType, Post } from '../../generated/types.generated';
import { PayloadAction } from '@reduxjs/toolkit';
import { api as commentsApi } from '@store/comment/comments.api';
import { api as postsApi } from '@store/post/posts.api';
import { api as timelineApi } from '@store/timeline/timeline.api';
import * as _ from 'lodash';
import intl from 'react-intl-universal';
import { all, call, fork, put, select, takeLatest } from 'redux-saga/effects';
import { LixiStoreStateInterface } from '../state';
import { showToast } from '../toast';
import { createCommentFailure, createCommentSuccess } from './action';
import { CreateCommentMutation, CreateReplyCommentMutation } from './comments.generated';

function* createCommentSuccessSaga(
  action: PayloadAction<{
    dataCreateComment?: CreateCommentMutation;
    dataCreateReplyComment?: CreateReplyCommentMutation;
    isReplyComment: boolean;
  }>
) {
  const { dataCreateComment, dataCreateReplyComment, isReplyComment } = action.payload;
  const rootState: LixiStoreStateInterface = yield select();

  const commentToId = isReplyComment
    ? dataCreateReplyComment.createReplyComment.commentable.commentToId
    : dataCreateComment.createComment;

  const commentToType = isReplyComment
    ? dataCreateReplyComment.createReplyComment.commentable.type
    : dataCreateComment.createComment.commentable.type;

  const commentableId = isReplyComment
    ? dataCreateReplyComment.createReplyComment.commentableId
    : dataCreateComment.createComment.commentableId;

  const commentCreatedInvalidatedBy = yield call(commentsApi.util.selectInvalidatedBy, rootState, ['CommentCreated']);
  for (const invalidatedBy of commentCreatedInvalidatedBy) {
    const { endpointName, originalArgs } = invalidatedBy;
    if (endpointName === 'CommentsToCommentableId' && originalArgs.id === commentableId) {
      //update comment in post
      yield put(
        commentsApi.util.updateQueryData('CommentsToCommentableId', originalArgs, draft => {
          draft.commentsToCommentableId.edges.unshift({
            cursor: isReplyComment ? dataCreateReplyComment.createReplyComment.id : dataCreateComment.createComment.id,
            node: isReplyComment
              ? { ...dataCreateReplyComment.createReplyComment }
              : { ...dataCreateComment.createComment }
          });
        })
      );
    } else if (endpointName === 'Post') {
      if (commentToId && commentToId === originalArgs.id) {
        yield put(
          postsApi.util.updateQueryData('Post', originalArgs, draft => {
            draft.post.totalComments = draft.post.totalComments + 1;
          })
        );
      }
    } else if (endpointName === 'HomeTimeline') {
      yield put(
        timelineApi.util.updateQueryData('HomeTimeline', originalArgs, draft => {
          const timelineItemToUpdateIndex = draft.homeTimeline.edges.findIndex(
            item => item.node.id === `${commentToType.toLowerCase()}:${commentToId}`
          );
          if (timelineItemToUpdateIndex >= 0) {
            const timelineItemToUpdate = draft.homeTimeline.edges[timelineItemToUpdateIndex];
            (draft.homeTimeline.edges[timelineItemToUpdateIndex].node.data as Post).totalComments =
              (timelineItemToUpdate.node.data as Post).totalComments + 1;
          }
        })
      );
    } else if (commentToType === CommentType.Post && _.startsWith(endpointName, 'Posts')) {
      yield put(
        postsApi.util.updateQueryData(endpointName, originalArgs, draft => {
          const fields = Object.keys(draft);
          for (const field of fields) {
            if (!draft[field]) continue;
            const postToUpdateIndex = draft[field].edges.findIndex(item => item.node.id === commentToId);
            if (postToUpdateIndex >= 0) {
              const postToUpdate = draft[field].edges[postToUpdateIndex];
              draft[field].edges[postToUpdateIndex].node.totalComments = postToUpdate.node.totalComments + 1;
            }
          }
        })
      );
    }
  }
}

function* createCommentFailureSaga(action: PayloadAction<string>) {
  let message = action.payload;
  if (!message) {
    message = intl.get('comment.unableCreateComment');
  }
  yield put(
    showToast('error', {
      message: 'Error',
      description: message,
      duration: 3
    })
  );
}

function* watchCreateCommentSuccess() {
  yield takeLatest(createCommentSuccess.type, createCommentSuccessSaga);
}

function* watchCommentCreateFailure() {
  yield takeLatest(createCommentFailure.type, createCommentFailureSaga);
}

export function* commentSaga() {
  yield all([fork(watchCreateCommentSuccess), fork(watchCommentCreateFailure)]);
}
