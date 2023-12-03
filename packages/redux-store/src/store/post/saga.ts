import { CreatePostCommand, EditPostCommand, ParamPostFollowCommand } from '@bcpros/lixi-models';
import { POST_TYPE } from '@bcpros/lixi-models/constants';
import { all, fork, put, select, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import * as _ from 'lodash';
import intl from 'react-intl-universal';
import * as Effects from 'redux-saga/effects';

import { hideLoading, showLoading } from '../loading/actions';
import { showToast } from '../toast/actions';

import {
  editPost,
  editPostFailure,
  editPostSuccess,
  fetchAllPosts,
  fetchAllPostsFailure,
  fetchAllPostsSuccess,
  getPost,
  getPostFailure,
  getPostsByAccountId,
  getPostSuccess,
  postPost,
  postPostFailure,
  postPostSuccess,
  setPost,
  setPostsByAccountId,
  setSelectedPost,
  changeFollowActionSheetPost,
  changeBookmarkActionSheet
} from './actions';
import postApi from './api';
import { api as timelineApi } from '@store/timeline/timeline.api';
import { api as postsApi } from '@store/post/posts.api';
import { FollowForType } from '@bcpros/lixi-models/lib/follow/follow.model';
import { OrderDirection, PostOrderField } from '@generated/types.generated';
import { RootState } from '@store/store';
const call: any = Effects.call;
/**
 * Generate a post
 * @param action The data to needed generate a post
 */

function* postPostSaga(action: PayloadAction<CreatePostCommand>) {
  try {
    const command = action.payload;

    yield put(showLoading(postPost.type));

    const dataApi: CreatePostCommand = {
      ...command
    };

    const data = yield call(postApi.post, dataApi);

    if (_.isNil(data) || _.isNil(data.id)) {
      throw new Error(intl.get('lixi.unableCreateLixi'));
    }

    yield put(postPostSuccess(data));
  } catch (err) {
    const message = (err as Error).message ?? intl.get('post.couldNotpostPost');
    yield put(postPostFailure(message));
  }
}

function* postPostSuccessSaga(action: PayloadAction<any>) {
  try {
    const post: any = action.payload;

    // Calculate
    yield put(
      showToast('success', {
        message: 'Success',
        description: intl.get('post.createPostSuccessful'),
        duration: 5
      })
    );
    yield put(setPost(post));
    yield put(hideLoading(postPost.type));
  } catch (error) {
    const message = intl.get('post.errorWhenCreatePost');
    yield put(postPostFailure(message));
  }
}

function* postPostFailureSaga(action: PayloadAction<string>) {
  const message = action.payload ?? intl.get('post.unableCreatePostServer');
  yield put(
    showToast('error', {
      message: 'Error',
      description: message,
      duration: 5
    })
  );
  yield put(hideLoading(postPost.type));
}

function* getPostSaga(action: PayloadAction<string>) {
  try {
    const id = action.payload;
    const data = yield call(postApi.getDetailPost, id);
    yield put(getPostSuccess(data));
  } catch (err) {
    const message = (err as Error).message ?? intl.get('post.unableSelect');
    yield put(getPostFailure(message));
  }
}

function* getPostFailureSaga(action: PayloadAction<string>) {
  const message = action.payload ?? intl.get('lixi.unableSelect');
  yield put(
    showToast('error', {
      message: 'Error',
      description: message,
      duration: 5
    })
  );
  yield put(hideLoading(getPost.type));
}

function* editPostSaga(action: PayloadAction<EditPostCommand>) {
  try {
    const { id } = action.payload;
    const command = action.payload;

    yield put(showLoading(editPost.type));

    const dataApi: EditPostCommand = {
      ...command
    };

    const data = yield call(postApi.update, id, dataApi);

    if (_.isNil(data) || _.isNil(data.id)) {
      throw new Error(intl.get('lixi.unableCreateLixi'));
    }

    yield put(editPostSuccess(data));
  } catch (err) {
    const message = (err as Error).message ?? intl.get('post.couldNoteditPost');
    yield put(editPostFailure(message));
  }
}

function* editPostSuccessSaga(action: PayloadAction<any>) {
  try {
    const post: any = action.payload;

    // Calculate
    yield put(
      showToast('success', {
        message: 'Success',
        description: intl.get('post.createPostSuccessful'),
        duration: 5
      })
    );
    yield put(setPost(post));
    yield put(hideLoading(editPost.type));
  } catch (error) {
    const message = intl.get('post.errorWhenCreatePost');
    yield put(editPostFailure(message));
  }
}

function* editPostFailureSaga(action: PayloadAction<string>) {
  const message = action.payload ?? intl.get('post.unableCreatePostServer');
  yield put(
    showToast('error', {
      message: 'Error',
      description: message,
      duration: 5
    })
  );
  yield put(hideLoading(editPost.type));
}

function* setPostSaga(action: PayloadAction<any>) {
  const post: any = action.payload;
  // yield put(push('/post/lixi'));
  // yield put(refreshLixiSilent(lixi.id));
}

function* getPostsByAccountIdSaga(action: PayloadAction<number>) {
  try {
    const command = action.payload;

    yield put(showLoading(getPostsByAccountId.type));

    const dataApi: number = command;

    const data: any = yield call(postApi.getAllPostByAccount, dataApi);

    if (_.isNil(data)) {
      throw new Error(intl.get('lixi.unableCreateLixi'));
    }

    yield put(setPostsByAccountId(data));
  } catch (err) {
    const message = (err as Error).message ?? intl.get('lixi.couldNotpostPost');
    yield put(postPostFailure(message));
  }
}

function* fetchAllPostsSaga() {
  try {
    yield put(showLoading(fetchAllPosts.type));

    const data: any = yield call(postApi.getAllPostsByPage);

    if (_.isNil(data)) {
      throw new Error(intl.get('post.couldNotFindPost'));
    }

    yield put(fetchAllPostsSuccess(data));
  } catch (err) {
    const message = (err as Error).message ?? intl.get('lixi.couldNotpostPost');
    yield put(fetchAllPostsFailure(message));
  }
}

function* changeFollowActionSheetPostSaga(action: PayloadAction<ParamPostFollowCommand>) {
  const { changeFollow, followForType, extraArgumentsPostFollow } = action.payload;
  const {
    minBurnFilterPage,
    minBurnFilterToken,
    minBurnFilterProfile,
    minBurnFilterHome,
    pageId,
    tokenId,
    accountId,
    tokenPrimaryId,
    hashtags,
    query,
    level,
    selectedAccountId
  } = extraArgumentsPostFollow;

  yield put(
    timelineApi.util.updateQueryData('HomeTimeline', { level }, draft => {
      const listPostUpdateFollow = draft.homeTimeline.edges.map((item, index) => {
        switch (followForType) {
          case FollowForType.Account:
            if (item.node.data.account.id === accountId) {
              draft.homeTimeline.edges[index].node.data.followPostOwner = !changeFollow;
            }
            break;
          case FollowForType.Page:
            if (item.node.data?.page?.id === pageId) {
              draft.homeTimeline.edges[index].node.data.followedPage = !changeFollow;
            }
            break;
          case FollowForType.Token:
            if (item.node.data?.token?.tokenId === tokenId) {
              draft.homeTimeline.edges[index].node.data.followedToken = !changeFollow;
            }
            break;
          default:
            break;
        }
      });
    })
  );

  yield put(
    postsApi.util.updateQueryData(
      'PostsByTokenId',
      { id: tokenPrimaryId, minBurnFilter: minBurnFilterToken },
      draft => {
        const listPostUpdateFollow = draft.allPostsByTokenId.edges.map((item, index) => {
          switch (followForType) {
            case FollowForType.Account:
              if (item.node.account.id === accountId) {
                draft.allPostsByTokenId.edges[index].node.followPostOwner = !changeFollow;
              }
              break;
            case FollowForType.Token:
              if (item.node?.token?.tokenId === tokenId) {
                draft.allPostsByTokenId.edges[index].node.followedToken = !changeFollow;
              }
              break;
            default:
              break;
          }
        });
      }
    )
  );

  yield put(
    postsApi.util.updateQueryData(
      'PostsByPageId',
      {
        id: pageId,
        minBurnFilter: minBurnFilterPage,
        accountId: selectedAccountId
      },
      draft => {
        const listPostUpdateFollow = draft.allPostsByPageId.edges.map((item, index) => {
          switch (followForType) {
            case FollowForType.Account:
              if (item.node.account.id === accountId) {
                draft.allPostsByPageId.edges[index].node.followPostOwner = !changeFollow;
              }
              break;
            case FollowForType.Page:
              if (item.node?.page?.id === pageId) {
                draft.allPostsByPageId.edges[index].node.followedPage = !changeFollow;
              }
              break;
            default:
              break;
          }
        });
      }
    )
  );

  yield put(
    postsApi.util.updateQueryData('PostsByUserId', { id: accountId, minBurnFilter: minBurnFilterProfile }, draft => {
      const listPostUpdateFollow = draft.allPostsByUserId.edges.map((item, index) => {
        if (item.node.account.id === accountId) {
          draft.allPostsByUserId.edges[index].node.followPostOwner = !changeFollow;
        }
      });
    })
  );

  yield put(
    postsApi.util.updateQueryData(
      'PostsBySearchWithHashtag',
      { hashtags: hashtags, query: query, minBurnFilter: minBurnFilterHome },
      draft => {
        const listPostUpdateFollow = draft.allPostsBySearchWithHashtag.edges.map((item, index) => {
          switch (followForType) {
            case FollowForType.Account:
              if (item.node.account.id === accountId) {
                draft.allPostsBySearchWithHashtag.edges[index].node.followPostOwner = !changeFollow;
              }
              break;
            case FollowForType.Page:
              if (item.node?.page?.id === pageId) {
                draft.allPostsBySearchWithHashtag.edges[index].node.followedPage = !changeFollow;
              }
              break;
            case FollowForType.Token:
              if (item.node?.token?.tokenId === tokenId) {
                draft.allPostsBySearchWithHashtag.edges[index].node.followedToken = !changeFollow;
              }
              break;
            default:
              break;
          }
        });
      }
    )
  );

  yield put(
    postsApi.util.updateQueryData(
      'PostsBySearchWithHashtagAtPage',
      { pageId, hashtags, query, minBurnFilter: minBurnFilterPage },
      draft => {
        const listPostUpdateFollow = draft.allPostsBySearchWithHashtagAtPage.edges.map((item, index) => {
          switch (followForType) {
            case FollowForType.Account:
              if (item.node.account.id === accountId) {
                draft.allPostsBySearchWithHashtagAtPage.edges[index].node.followPostOwner = !changeFollow;
              }
              break;
            case FollowForType.Page:
              if (item.node?.page?.id === pageId) {
                draft.allPostsBySearchWithHashtagAtPage.edges[index].node.followedPage = !changeFollow;
              }
              break;
            default:
              break;
          }
        });
      }
    )
  );

  yield put(
    postsApi.util.updateQueryData(
      'PostsBySearchWithHashtagAtToken',
      {
        tokenId: tokenPrimaryId,
        hashtags,
        query,
        minBurnFilter: minBurnFilterToken
      },
      draft => {
        const listPostUpdateFollow = draft.allPostsBySearchWithHashtagAtToken.edges.map((item, index) => {
          switch (followForType) {
            case FollowForType.Account:
              if (item.node.account.id === accountId) {
                draft.allPostsBySearchWithHashtagAtToken.edges[index].node.followPostOwner = !changeFollow;
              }
              break;
            case FollowForType.Token:
              if (item.node?.token?.tokenId === tokenId) {
                draft.allPostsBySearchWithHashtagAtToken.edges[index].node.followedToken = !changeFollow;
              }
              break;
            default:
              break;
          }
        });
      }
    )
  );
}

function* changeBookmarkActionSheetSaga(action: PayloadAction<string>) {
  const bookmarkForId = action.payload;
  const rootState: RootState = yield select();

  // Update timeline
  const timelineInvalidatedBy = yield call(timelineApi.util.selectInvalidatedBy, rootState, ['Timeline']);
  for (const invalidatedBy of timelineInvalidatedBy) {
    const { endpointName, originalArgs } = invalidatedBy;
    yield put(
      timelineApi.util.updateQueryData(endpointName, originalArgs, draft => {
        const fields = Object.keys(draft);
        for (const field of fields) {
          if (!draft[field]) continue;
          const timelineItemToUpdateIndex = draft[field].edges.findIndex(
            item => item.node.id === `${POST_TYPE.POST}:${bookmarkForId}`
          );
          const isBookmarked = draft[field].edges[timelineItemToUpdateIndex].node.data.isBookmarked;
          draft[field].edges[timelineItemToUpdateIndex].node.data.isBookmarked = !isBookmarked;
        }
      })
    );
  }

  //update posts
  const postsInvalidatedBy = yield call(postsApi.util.selectInvalidatedBy, rootState, ['Posts']);
  for (const invalidatedBy of postsInvalidatedBy) {
    const { endpointName, originalArgs } = invalidatedBy;
    yield put(
      postsApi.util.updateQueryData(endpointName, originalArgs, draft => {
        const fields = Object.keys(draft);
        for (const field of fields) {
          if (!draft[field]) continue;
          const postToUpdateIndex = draft[field].edges.findIndex(item => item.node.id === bookmarkForId);
          const isBookmarked = draft[field].edges[postToUpdateIndex].node.isBookmarked;
          draft[field].edges[postToUpdateIndex].node.isBookmarked = !isBookmarked;
        }
      })
    );
  }
}

function* fetchAllPostsSuccessSaga(action: any) {}

function* fetchAllPostsFailureSaga(action: any) {}

function* watchPostPost() {
  yield takeLatest(postPost.type, postPostSaga);
}

function* watchPostPostSuccess() {
  yield takeLatest(postPostSuccess.type, postPostSuccessSaga);
}

function* watchPostPostFailure() {
  yield takeLatest(postPostFailure.type, postPostFailureSaga);
}

function* watchEditPost() {
  yield takeLatest(editPost.type, editPostSaga);
}

function* watchEditPostSuccess() {
  yield takeLatest(editPostSuccess.type, editPostSuccessSaga);
}

function* watchEditPostFailure() {
  yield takeLatest(editPostFailure.type, editPostFailureSaga);
}

function* watchSetPost() {
  yield takeLatest(setPost.type, setPostSaga);
}

function* watchGetPostsByAccountId() {
  yield takeLatest(getPostsByAccountId.type, getPostsByAccountIdSaga);
}

function* watchFetchAllPosts() {
  yield takeLatest(fetchAllPosts.type, fetchAllPostsSaga);
}

function* watchFetchAllPostsSuccess() {
  yield takeLatest(fetchAllPostsSuccess.type, fetchAllPostsSuccessSaga);
}

function* watchFetchAllPostsFailure() {
  yield takeLatest(fetchAllPostsFailure.type, fetchAllPostsFailureSaga);
}

function* watchGetPost() {
  yield takeLatest(getPost.type, getPostSaga);
}

function* watchGetPostFailure() {
  yield takeLatest(getPostFailure.type, getPostFailureSaga);
}

function* watchChangeFollowActionSheetPost() {
  yield takeLatest(changeFollowActionSheetPost.type, changeFollowActionSheetPostSaga);
}

function* watchChangeBookmarkActionSheet() {
  yield takeLatest(changeBookmarkActionSheet.type, changeBookmarkActionSheetSaga);
}

export default function* postSaga() {
  yield all([
    fork(watchPostPost),
    fork(watchPostPostFailure),
    fork(watchPostPostSuccess),
    fork(watchSetPost),
    fork(watchGetPostsByAccountId),
    fork(watchFetchAllPosts),
    fork(watchFetchAllPostsSuccess),
    fork(watchFetchAllPostsFailure),
    fork(watchEditPost),
    fork(watchEditPostFailure),
    fork(watchEditPostSuccess),
    fork(watchGetPost),
    fork(watchGetPostFailure),
    fork(watchChangeFollowActionSheetPost),
    fork(watchChangeBookmarkActionSheet)
  ]);
}
