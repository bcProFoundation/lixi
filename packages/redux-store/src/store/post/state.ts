import { Upload } from '@bcpros/lixi-models/lib/upload';
import { EntityState } from '@reduxjs/toolkit';

export interface PostState extends EntityState<any, string> {
  isNewPost: boolean;
  selectedId: string;
  postsByAccountId: Array<any>;
  showCreatePost: boolean;
  tempEditPostCoverUploads: { images: Upload[]; imageUploadableId: string };
}
