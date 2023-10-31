import { Poll } from './types.generated';
import { AccountQuery } from '../store/account/accounts.generated';
import { CommentQuery } from '../store/comment/comments.generated';
import { HashtagQuery } from '../store/hashtag';
import { PageQuery } from '../store/page/pages.generated';
import { PostQuery } from '../store/post/posts.generated';
import { TimelineQuery } from '../store/timeline/timeline.generated';
import { TokenQuery } from '../store/token/tokens.generated';
import { WorshipQuery, WorshipedPersonQuery } from '../store/worship';

export type AccountQueryItem = AccountQuery['account'];
export type CommentQueryItem = CommentQuery['comment'];
export type HashtagQueryItem = HashtagQuery['hashtag'];
export type PageQueryItem = PageQuery['page'];
export type PostQueryItem = PostQuery['post'];
export type PollQueryItem = Poll;
export type TimelineQueryItem = TimelineQuery['timeline'];
export type TokenQueryItem = TokenQuery['token'];
export type WorshipQueryItem = WorshipQuery['worship'];
export type WorshipedPersonQueryItem = WorshipedPersonQuery['worshipedPerson'];

export type BurnForItem =
  | PostQueryItem
  | PollQueryItem
  | PageQueryItem
  | CommentQueryItem
  | TokenQueryItem
  | HashtagQueryItem
  | AccountQueryItem
  | WorshipQueryItem;
