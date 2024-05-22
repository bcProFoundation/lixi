import { createSelector } from 'reselect';

import { LixiStoreStateInterface } from '../state';

import { postAdapter } from './reducer';
import { PostState } from './state';

const selectAccounts = (state: LixiStoreStateInterface) => state.accounts;
const selectSelectedAccount = createSelector(selectAccounts, state => state.selectedId);

const { selectAll, selectEntities, selectIds, selectTotal } = postAdapter.getSelectors();

export const getAllPosts = createSelector((state: LixiStoreStateInterface) => state.posts, selectAll);

export const getAllPostsEntities = createSelector((state: LixiStoreStateInterface) => state.posts, selectEntities);

export const getSelectedPostId = createSelector(
  (state: LixiStoreStateInterface) => state.posts,
  (state: PostState) => state.selectedId as string
);

export const getNewPostAvailable = createSelector(
  (state: LixiStoreStateInterface) => state.posts,
  (state: PostState) => state.isNewPost as boolean
);

export const postsByAccountId = createSelector(
  (state: LixiStoreStateInterface) => state.posts,
  (state: PostState) => state.postsByAccountId
);

export const getPostById = (id: string) => createSelector(getAllPostsEntities, posts => posts?.[id]);

export const getShowCreatePost = createSelector(
  (state: LixiStoreStateInterface) => state.posts,
  (state: PostState) => state.showCreatePost
);
