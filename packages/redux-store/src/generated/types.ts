import { BurnFieldsFragment } from '../store/burn/burn.generated';
import { AccountQuery } from '../store/account/accounts.generated';
import { CommentQuery } from '../store/comment/comments.generated';
import { HashtagQuery } from '../store/hashtag';
import { PageQuery } from '../store/page/pages.generated';
import { PostQuery } from '../store/post/posts.generated';
import { TimelineQuery } from '../store/timeline/timeline.generated';
import { TokenQuery } from '../store/token/tokens.generated';
import { WorshipQuery, WorshipedPersonQuery } from '../store/worship';
import { Poll } from './types.generated';
import { Offer } from './types.generated';
import { EscrowOrderQuery } from '../store/escrow/escrow-order/escrow-order.generated';
import { DisputeQuery } from '../store/escrow/dispute/dispute.generated';

export type AccountQueryItem = AccountQuery['account'];
export type CommentQueryItem = CommentQuery['comment'];
export type HashtagQueryItem = HashtagQuery['hashtag'];
export type PageQueryItem = PageQuery['page'];
export type PostQueryItem = PostQuery['post'];
export type PollQueryItem = Poll;
export type OfferQueryItem = Offer;
export type EscrowOrderQueryItem = EscrowOrderQuery['escrowOrder'];
export type DisputeQueryItem = DisputeQuery['dispute'];
export type TimelineQueryItem = TimelineQuery['timeline'];
export type TimelineQueryData = TimelineQueryItem['data'];
export type TokenQueryItem = TokenQuery['token'];
export type WorshipQueryItem = WorshipQuery['worship'];
export type WorshipedPersonQueryItem = WorshipedPersonQuery['worshipedPerson'];
export type BurnQueryItem = BurnFieldsFragment;

export type BurnForItem =
  | PostQueryItem
  | PageQueryItem
  | CommentQueryItem
  | TokenQueryItem
  | HashtagQueryItem
  | AccountQueryItem
  | WorshipQueryItem;
