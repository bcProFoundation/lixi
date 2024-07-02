import { EntityState } from '@reduxjs/toolkit';

export interface PostState extends EntityState<any, string> {
  isNewPost: boolean;
  selectedId: string;
  postsByAccountId: Array<any>;
  showCreatePost: boolean;
}
