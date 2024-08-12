import { createEntityAdapter, createReducer, Update } from '@reduxjs/toolkit';

import { Post } from '../../generated/types.generated';
import {
  editPostSuccess,
  fetchAllPostsSuccess,
  getPostSuccess,
  postPostSuccess,
  removeAllUploadTempPost,
  removeUploadTempPost,
  setNewPostAvailable,
  setPost,
  setPostsByAccountId,
  setSelectedPost,
  setShowCreatePost,
  setUploadTempPost
} from './actions';
import { PostState } from './state';

export const postAdapter = createEntityAdapter<Post, string>({
  selectId: post => post.id,
  sortComparer: (a, b) => b.createdAt - a.createdAt
});

const initialState: PostState = postAdapter.getInitialState({
  isNewPost: false,
  selectedId: '',
  postsByAccountId: [],
  showCreatePost: true,
  tempEditPostCoverUploads: { images: [], imageUploadableId: null }
});

export const postReducer = createReducer(initialState, builder => {
  builder
    .addCase(postPostSuccess, (state, action) => {
      const post: any = action.payload;
      postAdapter.upsertOne(state, post as Post);
    })
    .addCase(getPostSuccess, (state, action) => {
      const post = action.payload;
      state.selectedId = post.id;
      const updatePost: Update<Post, string> = {
        id: post.id,
        changes: {
          ...post
        }
      };
      postAdapter.updateOne(state, updatePost);
    })
    .addCase(setPost, (state, action) => {
      const post: any = action.payload;
      state.selectedId = post.id ?? {};
    })
    .addCase(setSelectedPost, (state, action) => {
      state.selectedId = action.payload;
    })
    .addCase(setPostsByAccountId, (state, action) => {
      state.postsByAccountId = action.payload;
    })
    .addCase(fetchAllPostsSuccess, (state, action) => {
      postAdapter.setAll(state, action.payload);
    })
    .addCase(editPostSuccess, (state, action) => {
      const post = action.payload;
      const updatePost: Update<Post, string> = {
        id: post.id,
        changes: {
          ...post
        }
      };
      postAdapter.updateOne(state, updatePost);
    })
    .addCase(setNewPostAvailable, (state, action) => {
      state.isNewPost = action.payload;
    })
    .addCase(setShowCreatePost, (state, action) => {
      state.showCreatePost = action.payload;
    })
    .addCase(setUploadTempPost, (state, action) => {
      const { uploads, imageUploadableId } = action.payload;

      if (imageUploadableId) {
        state.tempEditPostCoverUploads.imageUploadableId = imageUploadableId;
      }
      state.tempEditPostCoverUploads.images.push(...uploads);
    })
    .addCase(removeUploadTempPost, (state, action) => {
      const { id } = action.payload;

      state.tempEditPostCoverUploads.images = state.tempEditPostCoverUploads.images.filter(image => {
        return image.id !== id;
      });
      if (state.tempEditPostCoverUploads.images.length === 0) {
        state.tempEditPostCoverUploads.imageUploadableId = null;
      }
    })
    .addCase(removeAllUploadTempPost, (state, action) => {
      state.tempEditPostCoverUploads.images = [];
      state.tempEditPostCoverUploads.imageUploadableId = null;
    });
});
