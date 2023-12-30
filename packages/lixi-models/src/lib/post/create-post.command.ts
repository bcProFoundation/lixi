import { IsNotEmpty } from 'class-validator';

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
  accountId?: number;
  pageId?: string;
  tokenId?: string;
}
