import { IsNotEmpty } from 'class-validator';

import { PostListType } from '../../constants';
import { FollowForType } from '../follow';

export class CreatePostCommand {
  @IsNotEmpty()
  content: string;
  pageId?: string;
  tokenId?: string;
  cover?: string;
}

export class EditPostCommand {
  @IsNotEmpty()
  id: string;

  pageId?: string;

  @IsNotEmpty()
  content: string;

  cover?: string;
}

export class ParamPostFollowCommand {
  changeFollow: boolean;
  followForType: FollowForType;
  extraArgumentsPostFollow?: ExtraArgumentsPostFollow;
}

export class ExtraArgumentsPostFollow {
  minBurnFilterPage?: number;
  minBurnFilterToken?: number;
  minBurnFilterProfile?: number;
  minBurnFilterHome?: number;
  level: number;
  postAccountId?: number;
  pageId?: string;
  tokenId?: string;
  tokenPrimaryId?: string;
  query?: string;
  hashtags?: string[];
  accountId?: number;
}

export class ParamPostPinCommand {
  postId: string;
  pageId?: string;
  accountId?: number;
  extraArgumentsPostPin?: ExtraArgumentsPostPin;
}

export class ExtraArgumentsPostPin {
  minBurnFilterPage?: number;
  minBurnFilterProfile?: number;
  postListType?: PostListType;
}
