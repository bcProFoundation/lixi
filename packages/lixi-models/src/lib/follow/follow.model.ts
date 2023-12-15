export enum Follow {
  Followers = 'followers',
  Followees = 'youFollow',
  FollowingPages = 'followingPages'
}

export enum FollowForType {
  Account = 'followAccount',
  Page = 'followPage',
  Token = 'followToken'
}

export interface FollowOfType {
  pageId?: string;
  tokenId?: string;
  accountId?: number;
}
