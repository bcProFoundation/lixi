export const PostType = {
  POST: 'POST',
  EVENT: 'EVENT',
  POLL: 'POLL',
  PRODUCT: 'PRODUCT',
  OFFER: 'OFFER'
} as const;
export type PostType = (typeof PostType)[keyof typeof PostType];
export const CommentType = {
  POST: 'POST',
  EVENT: 'EVENT',
  POLL: 'POLL',
  PRODUCT: 'PRODUCT',
  OFFER: 'OFFER'
} as const;
export type CommentType = (typeof CommentType)[keyof typeof CommentType];
export const Role = {
  MODERATOR: 'MODERATOR',
  ARBITRATOR: 'ARBITRATOR',
  USER: 'USER'
} as const;
export type Role = (typeof Role)[keyof typeof Role];
export const BurnType = {
  UPVOTE: 'UPVOTE',
  DOWNVOTE: 'DOWNVOTE'
} as const;
export type BurnType = (typeof BurnType)[keyof typeof BurnType];
export const AccountDanaHistoryType = {
  GIVEN: 'GIVEN',
  RECEIVED: 'RECEIVED'
} as const;
export type AccountDanaHistoryType = (typeof AccountDanaHistoryType)[keyof typeof AccountDanaHistoryType];
export const NotificationLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR'
} as const;
export type NotificationLevel = (typeof NotificationLevel)[keyof typeof NotificationLevel];
export const UserTwoFactorType = {
  email: 'email',
  sms: 'sms',
  authenticator: 'authenticator'
} as const;
export type UserTwoFactorType = (typeof UserTwoFactorType)[keyof typeof UserTwoFactorType];
export const ImageUploadableType = {
  ACCOUNT_AVATAR: 'ACCOUNT_AVATAR',
  ACCOUNT_COVER: 'ACCOUNT_COVER',
  PAGE_AVATAR: 'PAGE_AVATAR',
  PAGE_COVER: 'PAGE_COVER',
  POST: 'POST',
  COMMENT: 'COMMENT',
  LIXI: 'LIXI',
  TEMPLE_AVATAR: 'TEMPLE_AVATAR',
  TEMPLE_COVER: 'TEMPLE_COVER',
  MESSAGE: 'MESSAGE',
  EVENT: 'EVENT',
  POLL: 'POLL',
  PRODUCT: 'PRODUCT'
} as const;
export type ImageUploadableType = (typeof ImageUploadableType)[keyof typeof ImageUploadableType];
export const MessageType = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  FILE: 'FILE'
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];
export const PageMessageSessionStatus = {
  PENDING: 'PENDING',
  OPEN: 'OPEN',
  CLOSE: 'CLOSE'
} as const;
export type PageMessageSessionStatus = (typeof PageMessageSessionStatus)[keyof typeof PageMessageSessionStatus];
export const BookmarkType = {
  POST: 'POST',
  POLL: 'POLL',
  EVENT: 'EVENT',
  PRODUCT: 'PRODUCT',
  COMMENT: 'COMMENT'
} as const;
export type BookmarkType = (typeof BookmarkType)[keyof typeof BookmarkType];
export const EventType = {
  VIRTUAL: 'VIRTUAL',
  PHYSICAL: 'PHYSICAL'
} as const;
export type EventType = (typeof EventType)[keyof typeof EventType];
export const OfferType = {
  BUY: 'BUY',
  SELL: 'SELL'
} as const;
export type OfferType = (typeof OfferType)[keyof typeof OfferType];
export const OfferStatus = {
  ACTIVE: 'ACTIVE',
  ARCHIVE: 'ARCHIVE'
} as const;
export type OfferStatus = (typeof OfferStatus)[keyof typeof OfferStatus];
export const DisputeStatus = {
  ACTIVE: 'ACTIVE',
  RESOLVED: 'RESOLVED'
} as const;
export type DisputeStatus = (typeof DisputeStatus)[keyof typeof DisputeStatus];
export const EscrowOrderStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  ESCROW: 'ESCROW',
  COMPLETE: 'COMPLETE',
  CANCEL: 'CANCEL'
} as const;
export type EscrowOrderStatus = (typeof EscrowOrderStatus)[keyof typeof EscrowOrderStatus];
export const AddressType = {
  P2PKH: 'P2PKH',
  P2SH: 'P2SH'
} as const;
export type AddressType = (typeof AddressType)[keyof typeof AddressType];
export const Coin = {
  XPI: 'XPI',
  XEC: 'XEC',
  XRG: 'XRG'
} as const;
export type Coin = (typeof Coin)[keyof typeof Coin];
export const AccountType = {
  NORMAL: 'NORMAL',
  NONCUSTODIAL: 'NONCUSTODIAL'
} as const;
export type AccountType = (typeof AccountType)[keyof typeof AccountType];
