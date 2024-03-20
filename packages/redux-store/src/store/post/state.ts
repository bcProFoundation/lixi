import { EntityState } from '@reduxjs/toolkit';

export type PostState = EntityState<any> & {
  isNewPost: boolean;
  selectedId: string;
  postsByAccountId: Array<any>;
  showCreatePost: boolean;
}
