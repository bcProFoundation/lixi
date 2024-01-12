import { CommentType } from '@generated/index';
import { PayloadAction } from '@reduxjs/toolkit';
import { api as commentsApi } from '@store/comment/comments.api';
import { api as postsApi } from '@store/post/posts.api';
import { api as timelineApi } from '@store/timeline/timeline.api';
import * as _ from 'lodash';
import intl from 'react-intl-universal';
import { all, call, fork, put, select, takeLatest } from 'redux-saga/effects';
import { RootState } from '../store';
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
  const rootState: RootState = yield select();

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
          //update children
          if (isReplyComment) {
            const { parentId } = dataCreateReplyComment.createReplyComment;
            draft.commentsToCommentableId.edges.every((item, index) => {
              if (item.cursor === parentId) {
                //means node to insert at depth 1

                draft.commentsToCommentableId.edges[index].node.children.push({
                  ...dataCreateReplyComment.createReplyComment,
                  children: []
                });
                //break the loop
                return false;
              }

              //loop the children of node
              item.node.children &&
                item.node.children.every((itemChildren, indexChildren) => {
                  if (itemChildren.id === parentId) {
                    //means node to insert at depth 2
                    draft.commentsToCommentableId.edges[index].node.children[indexChildren].children.push({
                      ...dataCreateReplyComment.createReplyComment
                    });
                    //break the loop children
                    return false;
                  }

                  //continue loop children
                  return true;
                });

              //continue
              return true;
            });
          } else {
            //update root comment
            draft.commentsToCommentableId.edges.unshift({
              cursor: dataCreateComment.createComment.id,
              node: {
                ...dataCreateComment.createComment,
                children: []
              }
            });
          }
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
            draft.homeTimeline.edges[timelineItemToUpdateIndex].node.data.totalComments =
              timelineItemToUpdate.node.data.totalComments + 1;
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

export default function* commentSaga() {
  yield all([fork(watchCreateCommentSuccess), fork(watchCommentCreateFailure)]);
}
