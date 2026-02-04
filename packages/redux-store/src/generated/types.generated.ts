export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** The `BigInt` scalar type represents non-fractional signed whole numeric values. */
  BigInt: { input: any; output: any; }
  /** A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the `date-time` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar. */
  DateTime: { input: any; output: any; }
  /** An arbitrary-precision Decimal type */
  Decimal: { input: any; output: any; }
};

export type Account = {
  __typename?: 'Account';
  accountDana?: Maybe<AccountDana>;
  accountStatsOrder: AccountStatsOrder;
  accountType?: Maybe<AccountType>;
  address: Scalars['String']['output'];
  anonymousUsernameLocalecash?: Maybe<Scalars['String']['output']>;
  avatar?: Maybe<Scalars['String']['output']>;
  balance: Scalars['Int']['output'];
  bankInfo: BankInfo;
  coin?: Maybe<Coin>;
  cover?: Maybe<Scalars['String']['output']>;
  createCommentFee?: Maybe<Scalars['String']['output']>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  dayOfBirth?: Maybe<Scalars['Int']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  encryptedMnemonic?: Maybe<Scalars['String']['output']>;
  encryptedSecret?: Maybe<Scalars['String']['output']>;
  followersCount?: Maybe<Scalars['Int']['output']>;
  followingPagesCount?: Maybe<Scalars['Int']['output']>;
  followingsCount?: Maybe<Scalars['Int']['output']>;
  hash160?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  language: Scalars['String']['output'];
  messages?: Maybe<Array<Message>>;
  mnemonic?: Maybe<Scalars['String']['output']>;
  mnemonicHash?: Maybe<Scalars['String']['output']>;
  monthOfBirth?: Maybe<Scalars['Int']['output']>;
  name: Scalars['String']['output'];
  pageMessageSessions?: Maybe<Array<PageMessageSession>>;
  pages?: Maybe<Array<Page>>;
  publicKey?: Maybe<Scalars['String']['output']>;
  rankNumber?: Maybe<Scalars['Int']['output']>;
  rankScore?: Maybe<Scalars['Int']['output']>;
  role: Role;
  rootCoin?: Maybe<Coin>;
  secondaryLanguage?: Maybe<Scalars['String']['output']>;
  secret?: Maybe<Scalars['String']['output']>;
  telegramId?: Maybe<Scalars['String']['output']>;
  telegramUsername?: Maybe<Scalars['String']['output']>;
  totalDanaViewScore?: Maybe<Scalars['Int']['output']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  website?: Maybe<Scalars['String']['output']>;
  yearOfBirth?: Maybe<Scalars['Int']['output']>;
};

export type AccountBasicConnection = {
  __typename?: 'AccountBasicConnection';
  edges: Array<AccountBasicEdge>;
  pageInfo: BasicPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type AccountBasicEdge = {
  __typename?: 'AccountBasicEdge';
  cursor: Scalars['String']['output'];
  node: Account;
};

export type AccountConnection = {
  __typename?: 'AccountConnection';
  edges?: Maybe<Array<AccountEdge>>;
  pageInfo: PageInfo;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type AccountDana = {
  __typename?: 'AccountDana';
  account: Account;
  accountDanaHistory?: Maybe<Array<AccountDanaHistory>>;
  accountId: Scalars['Int']['output'];
  danaBurnDown: Scalars['Float']['output'];
  danaBurnScore: Scalars['Float']['output'];
  danaBurnUp: Scalars['Float']['output'];
  danaGiven?: Maybe<Scalars['Float']['output']>;
  danaReceived?: Maybe<Scalars['Float']['output']>;
  danaReceivedDown: Scalars['Float']['output'];
  danaReceivedScore: Scalars['Float']['output'];
  danaReceivedUp: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  version: Scalars['Int']['output'];
};

export type AccountDanaHistory = {
  __typename?: 'AccountDanaHistory';
  id: Scalars['ID']['output'];
};

export type AccountEdge = {
  __typename?: 'AccountEdge';
  cursor: Scalars['String']['output'];
  node: Account;
};

export type AccountOrder = {
  direction: OrderDirection;
  field: AccountOrderField;
};

/** Properties by which account connections can be ordered. */
export enum AccountOrderField {
  Address = 'address',
  CreatedAt = 'createdAt',
  Id = 'id',
  Name = 'name',
  UpdatedAt = 'updatedAt'
}

export type AccountStatsOrder = {
  __typename?: 'AccountStatsOrder';
  completedOrder: Scalars['Int']['output'];
  donationAmount: Scalars['Float']['output'];
  uniqueTrades: Scalars['Int']['output'];
};

/** The type of account. */
export enum AccountType {
  Noncustodial = 'NONCUSTODIAL',
  Normal = 'NORMAL'
}

export type AllFiatRates = {
  __typename?: 'AllFiatRates';
  currency: Scalars['String']['output'];
  fiatRates: Array<CurrencyRate>;
};

export type Balances = {
  __typename?: 'Balances';
  totalBalance: Scalars['String']['output'];
  totalBalanceInSatoshis: Scalars['String']['output'];
};

export type BankInfo = {
  __typename?: 'BankInfo';
  accountNameApp?: Maybe<Scalars['String']['output']>;
  accountNameBank?: Maybe<Scalars['String']['output']>;
  accountNumberApp?: Maybe<Scalars['String']['output']>;
  accountNumberBank?: Maybe<Scalars['String']['output']>;
  appName?: Maybe<Scalars['String']['output']>;
  bankName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  orderId: Scalars['String']['output'];
};

export type BankInfoInput = {
  accountNameApp?: InputMaybe<Scalars['String']['input']>;
  accountNameBank?: InputMaybe<Scalars['String']['input']>;
  accountNumberApp?: InputMaybe<Scalars['String']['input']>;
  accountNumberBank?: InputMaybe<Scalars['String']['input']>;
  appName?: InputMaybe<Scalars['String']['input']>;
  bankName?: InputMaybe<Scalars['String']['input']>;
};

export type BasicPageInfo = {
  __typename?: 'BasicPageInfo';
  endCursor: Scalars['String']['output'];
  hasNextPage: Scalars['Boolean']['output'];
};

export type Bookmark = {
  __typename?: 'Bookmark';
  account: Account;
  accountId: Scalars['Int']['output'];
  bookmarkableId: Scalars['String']['output'];
  /** Identifies the date and time when the object was created. */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** The type of bookmark. */
export enum BookmarkType {
  Comment = 'COMMENT',
  Event = 'EVENT',
  Poll = 'POLL',
  Post = 'POST',
  Product = 'PRODUCT'
}

export type BoostFee = {
  __typename?: 'BoostFee';
  boostForId: Scalars['String']['output'];
  boostForType: BoostForType;
  boostType: BoostType;
  boostedByHash: Scalars['String']['output'];
  boostedValue: Scalars['Int']['output'];
  /** Identifies the date and time when the object was created. */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['String']['output'];
  txid: Scalars['String']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** Boost for something. */
export enum BoostForType {
  Account = 'Account',
  Comment = 'Comment',
  Page = 'Page',
  Post = 'Post',
  Token = 'Token',
  Worship = 'Worship'
}

/** The type of boost. */
export enum BoostType {
  Down = 'Down',
  Up = 'Up'
}

export type BurnBasicConnection = {
  __typename?: 'BurnBasicConnection';
  edges: Array<BurnItemBasicEdge>;
  pageInfo: BasicPageInfo;
  totalCount: Scalars['Int']['output'];
};

export enum BurnForTypeItem {
  Account = 'Account',
  Comment = 'Comment',
  Page = 'Page',
  Post = 'Post',
  Token = 'Token',
  Worship = 'Worship'
}

export type BurnItem = {
  __typename?: 'BurnItem';
  burnForId: Scalars['String']['output'];
  burnForType: BurnForTypeItem;
  burnType: Scalars['Boolean']['output'];
  burnedBy: Account;
  burnedValue: Scalars['Int']['output'];
  coinBurned?: Maybe<Coin>;
  /** Identifies the date and time when the object was created. */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  txid: Scalars['String']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type BurnItemBasicEdge = {
  __typename?: 'BurnItemBasicEdge';
  cursor: Scalars['String']['output'];
  node: BurnItem;
};

export type Category = {
  __typename?: 'Category';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type City = {
  __typename?: 'City';
  country: Country;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  state: State;
};

export type ClosePageMessageSessionInput = {
  pageMessageSessionId: Scalars['String']['input'];
};

/** The type of coin. */
export enum Coin {
  Xec = 'XEC',
  Xpi = 'XPI',
  Xrg = 'XRG'
}

export type Comment = {
  __typename?: 'Comment';
  commentAccount: Account;
  commentAccountId?: Maybe<Scalars['Int']['output']>;
  commentByPublicKey?: Maybe<Scalars['String']['output']>;
  commentDana?: Maybe<CommentDana>;
  commentText: Scalars['String']['output'];
  commentable?: Maybe<Commentable>;
  commentableId?: Maybe<Scalars['String']['output']>;
  content: Scalars['String']['output'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  danaBurnDown: Scalars['Float']['output'];
  danaBurnScore: Scalars['Float']['output'];
  danaBurnUp: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  imageUploadable?: Maybe<ImageUploadable>;
  parent?: Maybe<Comment>;
  parentId?: Maybe<Scalars['String']['output']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type CommentConnection = {
  __typename?: 'CommentConnection';
  edges?: Maybe<Array<CommentEdge>>;
  pageInfo: PageInfo;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type CommentDana = {
  __typename?: 'CommentDana';
  comment: Comment;
  commentId: Scalars['String']['output'];
  danaBurnDown: Scalars['Float']['output'];
  danaBurnScore: Scalars['Float']['output'];
  danaBurnUp: Scalars['Float']['output'];
  version: Scalars['Int']['output'];
};

export type CommentEdge = {
  __typename?: 'CommentEdge';
  cursor: Scalars['String']['output'];
  node: Comment;
};

export type CommentOrder = {
  direction: OrderDirection;
  field: CommentOrderField;
};

/** Properties by which comment connections can be ordered. */
export enum CommentOrderField {
  CreatedAt = 'createdAt',
  DanaBurnScore = 'danaBurnScore',
  Id = 'id',
  UpdatedAt = 'updatedAt'
}

/** The type comment attach to */
export enum CommentType {
  Event = 'EVENT',
  Offer = 'OFFER',
  Poll = 'POLL',
  Post = 'POST',
  Product = 'PRODUCT'
}

export type Commentable = {
  __typename?: 'Commentable';
  commentToId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  type: CommentType;
};

export type ConvertDana = {
  convertToCoin: Coin;
};

export type Country = {
  __typename?: 'Country';
  capital: Scalars['String']['output'];
  city: Array<City>;
  id: Scalars['ID']['output'];
  iso2?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  state: Array<State>;
};

export type CreateBookmarkInput = {
  accountId: Scalars['Int']['input'];
  bookmarkForId: Scalars['String']['input'];
  bookmarkType: BookmarkType;
};

export type CreateBoostInput = {
  boostForId: Scalars['String']['input'];
  boostForType: BoostForType;
  boostType: BoostType;
  boostedBy: Scalars['String']['input'];
  boostedValue: Scalars['Int']['input'];
  txHex: Scalars['String']['input'];
};

export type CreateCommentInput = {
  coinGive?: InputMaybe<Coin>;
  commentByPublicKey?: InputMaybe<Scalars['String']['input']>;
  commentText: Scalars['String']['input'];
  commentableId: Scalars['String']['input'];
  createFeeHex?: InputMaybe<Scalars['String']['input']>;
  replyToCommentId?: InputMaybe<Scalars['String']['input']>;
  tipHex?: InputMaybe<Scalars['String']['input']>;
  uploadId?: InputMaybe<Scalars['String']['input']>;
};

export type CreateDisputeInput = {
  createdBy: Scalars['String']['input'];
  escrowOrderId: Scalars['String']['input'];
  reason: Scalars['String']['input'];
  socketId?: InputMaybe<Scalars['String']['input']>;
};

export type CreateEscrowOrderInput = {
  amount: Scalars['Float']['input'];
  amountCoinOrCurrency: Scalars['Float']['input'];
  arbitratorId: Scalars['Int']['input'];
  bankInfoInput?: InputMaybe<BankInfoInput>;
  buyerDepositTx?: InputMaybe<Scalars['String']['input']>;
  escrowAddress: Scalars['String']['input'];
  escrowBuyerDepositFeeAddress?: InputMaybe<Scalars['String']['input']>;
  escrowBuyerDepositFeeScript?: InputMaybe<Scalars['String']['input']>;
  escrowFeeAddress: Scalars['String']['input'];
  escrowFeeScript: Scalars['String']['input'];
  escrowScript: Scalars['String']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
  moderatorId: Scalars['Int']['input'];
  nonce: Scalars['String']['input'];
  offerAccountId: Scalars['Int']['input'];
  paymentMethodId: Scalars['Int']['input'];
  postId: Scalars['String']['input'];
  price: Scalars['String']['input'];
  utxoInProcess?: InputMaybe<UtxoInNodeInput>;
};

export type CreateEventInput = {
  createFeeHex?: InputMaybe<Scalars['String']['input']>;
  endDate: Scalars['DateTime']['input'];
  eventType: EventType;
  htmlContent: Scalars['String']['input'];
  location?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  pageId?: InputMaybe<Scalars['String']['input']>;
  pureContent: Scalars['String']['input'];
  startDate: Scalars['DateTime']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
  uploads?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CreateFollowAccountInput = {
  followerAccountId: Scalars['Int']['input'];
  followingAccountId: Scalars['Int']['input'];
};

export type CreateFollowPageInput = {
  accountId: Scalars['Int']['input'];
  pageId: Scalars['String']['input'];
};

export type CreateFollowTokenInput = {
  accountId: Scalars['Int']['input'];
  tokenId: Scalars['String']['input'];
};

export type CreateMessageInput = {
  authorId: Scalars['Int']['input'];
  body?: InputMaybe<Scalars['String']['input']>;
  coinGive?: InputMaybe<Coin>;
  isPageOwner?: InputMaybe<Scalars['Boolean']['input']>;
  pageMessageSessionId?: InputMaybe<Scalars['String']['input']>;
  tipHex?: InputMaybe<Scalars['String']['input']>;
  uploadIds?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CreateOfferInput = {
  coin: Coin;
  coinOthers?: InputMaybe<Scalars['String']['input']>;
  coinPayment?: InputMaybe<Scalars['String']['input']>;
  createFeeHex?: InputMaybe<Scalars['String']['input']>;
  hideFromHome?: InputMaybe<Scalars['Boolean']['input']>;
  localCurrency?: InputMaybe<Scalars['String']['input']>;
  locationId?: InputMaybe<Scalars['String']['input']>;
  marginPercentage: Scalars['Float']['input'];
  message: Scalars['String']['input'];
  noteOffer?: InputMaybe<Scalars['String']['input']>;
  orderLimitMax?: InputMaybe<Scalars['Float']['input']>;
  orderLimitMin?: InputMaybe<Scalars['Float']['input']>;
  pageId?: InputMaybe<Scalars['String']['input']>;
  paymentApp?: InputMaybe<Scalars['String']['input']>;
  paymentMethodIds: Array<Scalars['Int']['input']>;
  paymentTypeGoodsServices?: InputMaybe<GoodsServicesPaymentType>;
  price: Scalars['String']['input'];
  priceCoinOthers?: InputMaybe<Scalars['Float']['input']>;
  priceGoodsServices?: InputMaybe<Scalars['Float']['input']>;
  tickerPriceGoodsServices?: InputMaybe<Scalars['String']['input']>;
  type: OfferType;
};

export type CreatePageInput = {
  categoryId?: InputMaybe<Scalars['String']['input']>;
  description: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type CreatePageMessageInput = {
  accountId: Scalars['Int']['input'];
  accountSecret?: InputMaybe<Scalars['String']['input']>;
  lixiId?: InputMaybe<Scalars['Int']['input']>;
  pageId: Scalars['String']['input'];
};

export type CreatePollInput = {
  canAddOption: Scalars['Boolean']['input'];
  coinFee?: InputMaybe<Coin>;
  createFeeHex?: InputMaybe<Scalars['String']['input']>;
  endDate: Scalars['DateTime']['input'];
  options: Array<PollOptionInput>;
  pageId?: InputMaybe<Scalars['String']['input']>;
  question: Scalars['String']['input'];
  singleSelect: Scalars['Boolean']['input'];
  startDate: Scalars['DateTime']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};

export type CreatePostInput = {
  coinFee?: InputMaybe<Coin>;
  createFeeHex?: InputMaybe<Scalars['String']['input']>;
  extraArguments?: InputMaybe<ExtraArguments>;
  htmlContent: Scalars['String']['input'];
  pageAccountId?: InputMaybe<Scalars['Int']['input']>;
  pageId?: InputMaybe<Scalars['String']['input']>;
  pureContent: Scalars['String']['input'];
  tokenPrimaryId?: InputMaybe<Scalars['String']['input']>;
  uploads?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CreateProductInput = {
  categoryId?: InputMaybe<Scalars['Int']['input']>;
  createFeeHex?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  htmlContent: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  pageId?: InputMaybe<Scalars['String']['input']>;
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  price: Scalars['Int']['input'];
  priceUnit: Scalars['String']['input'];
  pureContent: Scalars['String']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
  uploads?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CreateTempleInput = {
  achievement?: InputMaybe<Scalars['String']['input']>;
  address?: InputMaybe<Scalars['String']['input']>;
  alias?: InputMaybe<Scalars['String']['input']>;
  avatar?: InputMaybe<Scalars['String']['input']>;
  cityId?: InputMaybe<Scalars['String']['input']>;
  countryId?: InputMaybe<Scalars['String']['input']>;
  cover?: InputMaybe<Scalars['String']['input']>;
  dateOfCompleted?: InputMaybe<Scalars['DateTime']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  president?: InputMaybe<Scalars['String']['input']>;
  religion?: InputMaybe<Scalars['String']['input']>;
  stateId?: InputMaybe<Scalars['String']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
};

export type CreateTokenInput = {
  tokenId: Scalars['String']['input'];
};

export type CreateVoteInput = {
  accountId: Scalars['Int']['input'];
  optionId: Scalars['String']['input'];
  pollId: Scalars['String']['input'];
  previousOptionIds?: InputMaybe<Array<Scalars['String']['input']>>;
  singleSelect: Scalars['Boolean']['input'];
};

export type CreateWorshipInput = {
  latitude?: InputMaybe<Scalars['Decimal']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  longitude?: InputMaybe<Scalars['Decimal']['input']>;
  templeId?: InputMaybe<Scalars['String']['input']>;
  worshipedAmount: Scalars['Float']['input'];
  worshipedPersonId?: InputMaybe<Scalars['String']['input']>;
};

export type CreateWorshipedPersonInput = {
  avatar?: InputMaybe<Scalars['String']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  cityId?: InputMaybe<Scalars['String']['input']>;
  countryId?: InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: InputMaybe<Scalars['String']['input']>;
  dateOfDeath?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  quote?: InputMaybe<Scalars['String']['input']>;
  stateId?: InputMaybe<Scalars['String']['input']>;
  wikiDataId?: InputMaybe<Scalars['String']['input']>;
};

export type CurrencyRate = {
  __typename?: 'CurrencyRate';
  coin: Scalars['String']['output'];
  rate: Scalars['Float']['output'];
  ts: Scalars['Float']['output'];
};

export type CurrencyRates = {
  __typename?: 'CurrencyRates';
  coin: Scalars['String']['output'];
  rates: Array<RateEntry>;
};

export type DeleteFollowAccountInput = {
  followerAccountId: Scalars['Int']['input'];
  followingAccountId: Scalars['Int']['input'];
};

export type DeleteFollowPageInput = {
  accountId: Scalars['Int']['input'];
  pageId: Scalars['String']['input'];
};

export type DeleteFollowTokenInput = {
  accountId: Scalars['Int']['input'];
  tokenId: Scalars['String']['input'];
};

export type Dispute = {
  __typename?: 'Dispute';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  createdBy: Scalars['String']['output'];
  escrowOrder: EscrowOrder;
  escrowOrderId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  reason?: Maybe<Scalars['String']['output']>;
  status: DisputeStatus;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type DisputeEdge = {
  __typename?: 'DisputeEdge';
  cursor: Scalars['String']['output'];
  node: Dispute;
};

/** The status of dispute. */
export enum DisputeStatus {
  Active = 'ACTIVE',
  Resolved = 'RESOLVED'
}

export type DistributionModel = {
  __typename?: 'DistributionModel';
  address: Scalars['String']['output'];
  distributionType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  lixiId: Scalars['Int']['output'];
};

export type EnvelopeModel = {
  __typename?: 'EnvelopeModel';
  /** Identifies the date and time when the object was created. */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  image: Scalars['String']['output'];
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
  thumbnail: Scalars['String']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type EscrowOrder = {
  __typename?: 'EscrowOrder';
  allowOfferTakerChat?: Maybe<Scalars['Boolean']['output']>;
  amount: Scalars['Float']['output'];
  amountCoinOrCurrency: Scalars['Float']['output'];
  arbitratorAccount: Account;
  arbitratorAccountId: Scalars['Int']['output'];
  bankInfo?: Maybe<BankInfo>;
  buyerAccount: Account;
  buyerAccountId: Scalars['Int']['output'];
  buyerDepositTx?: Maybe<Scalars['String']['output']>;
  buyerDonateAmount?: Maybe<Scalars['Float']['output']>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  dispute?: Maybe<Dispute>;
  escrowAddress: Scalars['String']['output'];
  escrowBuyerDepositFeeAddress?: Maybe<Scalars['String']['output']>;
  escrowBuyerDepositFeeScript?: Maybe<Scalars['String']['output']>;
  escrowFeeAddress?: Maybe<Scalars['String']['output']>;
  escrowFeeScript?: Maybe<Scalars['String']['output']>;
  escrowScript: Scalars['String']['output'];
  escrowTxids?: Maybe<Array<EscrowTxid>>;
  id: Scalars['ID']['output'];
  markAsPaid?: Maybe<Scalars['Boolean']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  moderatorAccount: Account;
  moderatorAccountId: Scalars['Int']['output'];
  nonce: Scalars['String']['output'];
  offer: Offer;
  offerId: Scalars['String']['output'];
  paymentMethod: PaymentMethod;
  paymentMethodId: Scalars['Int']['output'];
  price: Scalars['String']['output'];
  releaseSignatory?: Maybe<Scalars['String']['output']>;
  releaseTxid?: Maybe<Scalars['String']['output']>;
  returnBuyerDepositFeeSignatory?: Maybe<Scalars['String']['output']>;
  returnBuyerDepositFeeTxid?: Maybe<Scalars['String']['output']>;
  returnFeeSignatory?: Maybe<Scalars['String']['output']>;
  returnFeeTxid?: Maybe<Scalars['String']['output']>;
  returnSignatory?: Maybe<Scalars['String']['output']>;
  returnTxid?: Maybe<Scalars['String']['output']>;
  sellerAccount: Account;
  sellerAccountId: Scalars['Int']['output'];
  sellerDonateAmount?: Maybe<Scalars['Float']['output']>;
  signatoryOwnerBuyerDepositFeeHash160?: Maybe<Scalars['String']['output']>;
  signatoryOwnerFeeHash160?: Maybe<Scalars['String']['output']>;
  signatoryOwnerHash160?: Maybe<Scalars['String']['output']>;
  status: EscrowOrderStatus;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

/** The action of escrow order. */
export enum EscrowOrderAction {
  BuyerConfirmReceipt = 'BUYER_CONFIRM_RECEIPT',
  Release = 'RELEASE',
  Return = 'RETURN',
  ReturnBuyerFee = 'RETURN_BUYER_FEE',
  ReturnFee = 'RETURN_FEE'
}

export type EscrowOrderConnection = {
  __typename?: 'EscrowOrderConnection';
  edges?: Maybe<Array<EscrowOrderEdge>>;
  pageInfo: PageInfo;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type EscrowOrderEdge = {
  __typename?: 'EscrowOrderEdge';
  cursor: Scalars['String']['output'];
  node: EscrowOrder;
};

/** The status of escrow order. */
export enum EscrowOrderStatus {
  Active = 'ACTIVE',
  Cancel = 'CANCEL',
  Complete = 'COMPLETE',
  Escrow = 'ESCROW',
  Pending = 'PENDING'
}

export type EscrowTxid = {
  __typename?: 'EscrowTxid';
  buyerDepositFeeOutIdx?: Maybe<Scalars['Int']['output']>;
  buyerDepositFeeValue?: Maybe<Scalars['BigInt']['output']>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  escrowOrder: EscrowOrder;
  escrowOrderId: Scalars['String']['output'];
  feeOutIdx?: Maybe<Scalars['Int']['output']>;
  feeValue?: Maybe<Scalars['BigInt']['output']>;
  outIdx: Scalars['Int']['output'];
  txid: Scalars['String']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  value: Scalars['BigInt']['output'];
};

export type Event = {
  __typename?: 'Event';
  account: Account;
  accountId: Scalars['Int']['output'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  dana: EventDana;
  danaViewScore?: Maybe<Scalars['Float']['output']>;
  description: Scalars['String']['output'];
  endDate: Scalars['DateTime']['output'];
  eventType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  imageUploadable?: Maybe<ImageUploadable>;
  imageUploadableId?: Maybe<Scalars['String']['output']>;
  location?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  page?: Maybe<Page>;
  pageId?: Maybe<Scalars['String']['output']>;
  startDate: Scalars['DateTime']['output'];
  token?: Maybe<Token>;
  tokenId?: Maybe<Scalars['String']['output']>;
  totalComments?: Maybe<Scalars['Int']['output']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type EventDana = {
  __typename?: 'EventDana';
  danaBurnDown: Scalars['Float']['output'];
  danaBurnScore: Scalars['Float']['output'];
  danaBurnUp: Scalars['Float']['output'];
  danaReceivedDown: Scalars['Float']['output'];
  danaReceivedScore: Scalars['Float']['output'];
  danaReceivedUp: Scalars['Float']['output'];
  event: Event;
  eventId: Scalars['String']['output'];
  version: Scalars['Int']['output'];
};

/** The type of event. */
export enum EventType {
  Physical = 'PHYSICAL',
  Virtual = 'VIRTUAL'
}

export type ExtraArguments = {
  hashtagId?: InputMaybe<Scalars['String']['input']>;
  hashtags?: InputMaybe<Array<Scalars['String']['input']>>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PostOrder>;
  query?: InputMaybe<Scalars['String']['input']>;
};

export type FiatRates = {
  __typename?: 'FiatRates';
  currency: Scalars['String']['output'];
  fiatRates: Array<CurrencyRates>;
};

export type FollowAccount = {
  __typename?: 'FollowAccount';
  avatar: Scalars['String']['output'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  followerAccount?: Maybe<Account>;
  followerAccountId?: Maybe<Scalars['Int']['output']>;
  followingAccount?: Maybe<Account>;
  followingAccountId?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  isFollowed?: Maybe<Scalars['Boolean']['output']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type FollowAccountEdge = {
  __typename?: 'FollowAccountEdge';
  cursor: Scalars['String']['output'];
  node: FollowAccount;
};

export type FollowPage = {
  __typename?: 'FollowPage';
  account?: Maybe<Account>;
  accountId?: Maybe<Scalars['Int']['output']>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  id?: Maybe<Scalars['ID']['output']>;
  isFollowed?: Maybe<Scalars['Boolean']['output']>;
  page?: Maybe<Page>;
  pageId?: Maybe<Scalars['String']['output']>;
  token?: Maybe<Token>;
  tokenId?: Maybe<Scalars['String']['output']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type FollowPageEdge = {
  __typename?: 'FollowPageEdge';
  cursor: Scalars['String']['output'];
  node: FollowPage;
};

/** Payment type for Goods & Services offers. */
export enum GoodsServicesPaymentType {
  External = 'EXTERNAL',
  InApp = 'IN_APP'
}

export type Hashtag = {
  __typename?: 'Hashtag';
  content: Scalars['String']['output'];
  /** Identifies the date and time when the object was created. */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  danaBurnDown: Scalars['Float']['output'];
  danaBurnScore: Scalars['Float']['output'];
  danaBurnUp: Scalars['Float']['output'];
  hashtagDana?: Maybe<HashtagDana>;
  id: Scalars['ID']['output'];
  normalizedContent: Scalars['String']['output'];
  postHashtags?: Maybe<Array<PostHashtag>>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type HashtagConnection = {
  __typename?: 'HashtagConnection';
  edges?: Maybe<Array<HashtagEdge>>;
  pageInfo: PageInfo;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type HashtagDana = {
  __typename?: 'HashtagDana';
  danaBurnDown: Scalars['Float']['output'];
  danaBurnScore: Scalars['Float']['output'];
  danaBurnUp: Scalars['Float']['output'];
  danaReceivedDown: Scalars['Float']['output'];
  danaReceivedScore: Scalars['Float']['output'];
  danaReceivedUp: Scalars['Float']['output'];
  hashtag?: Maybe<Hashtag>;
  hashtagId?: Maybe<Scalars['String']['output']>;
  version: Scalars['Int']['output'];
};

export type HashtagEdge = {
  __typename?: 'HashtagEdge';
  cursor: Scalars['String']['output'];
  node: Hashtag;
};

export type HashtagOrder = {
  direction: OrderDirection;
  field: HashtagOrderField;
};

/** Properties by which hashtag connections can be ordered. */
export enum HashtagOrderField {
  CreatedAt = 'createdAt',
  DanaBurnScore = 'danaBurnScore',
  Id = 'id',
  UpdatedAt = 'updatedAt'
}

export type ImageUploadable = {
  __typename?: 'ImageUploadable';
  account: Account;
  accountAvatar?: Maybe<Account>;
  accountCover?: Maybe<Account>;
  comment?: Maybe<Comment>;
  event?: Maybe<Event>;
  id: Scalars['ID']['output'];
  imageUploadableTo?: Maybe<ImageUploadableTo>;
  lixi?: Maybe<LixiModel>;
  message?: Maybe<Message>;
  pageAvatar?: Maybe<Page>;
  pageCover?: Maybe<Page>;
  poll?: Maybe<Poll>;
  post?: Maybe<Post>;
  product?: Maybe<Product>;
  templeAvatar?: Maybe<Temple>;
  templeCover?: Maybe<Temple>;
  type?: Maybe<ImageUploadableType>;
  uploads: Array<Upload>;
};

export type ImageUploadableTo = Comment | Event | Message | Poll | Post | Product;

/** Properties by type of the image uploadable. */
export enum ImageUploadableType {
  AccountAvatar = 'ACCOUNT_AVATAR',
  AccountCover = 'ACCOUNT_COVER',
  Comment = 'COMMENT',
  Event = 'EVENT',
  Lixi = 'LIXI',
  Message = 'MESSAGE',
  PageAvatar = 'PAGE_AVATAR',
  PageCover = 'PAGE_COVER',
  Poll = 'POLL',
  Post = 'POST',
  Product = 'PRODUCT',
  TempleAvatar = 'TEMPLE_AVATAR',
  TempleCover = 'TEMPLE_COVER'
}

export type LatestMessage = {
  __typename?: 'LatestMessage';
  author?: Maybe<LatestMessageAuthor>;
  body?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
};

export type LatestMessageAuthor = {
  __typename?: 'LatestMessageAuthor';
  address?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['Int']['output']>;
};

export type LixiModel = {
  __typename?: 'LixiModel';
  accountId: Scalars['Int']['output'];
  /** Identifies the date and time when the object was activated. */
  activationAt?: Maybe<Scalars['DateTime']['output']>;
  address: Scalars['String']['output'];
  amount: Scalars['String']['output'];
  balance?: Maybe<Scalars['Int']['output']>;
  claimCode?: Maybe<Scalars['String']['output']>;
  claimType: Scalars['Int']['output'];
  claimedNum: Scalars['Int']['output'];
  country?: Maybe<Scalars['String']['output']>;
  /** Identifies the date and time when the object was created. */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  distributions?: Maybe<Array<DistributionModel>>;
  dividedValue: Scalars['Int']['output'];
  encryptedClaimCode: Scalars['String']['output'];
  envelope?: Maybe<EnvelopeModel>;
  envelopeId?: Maybe<Scalars['Int']['output']>;
  envelopeMessage?: Maybe<Scalars['String']['output']>;
  /** Identifies the date and time when the object was expired. */
  expiryAt?: Maybe<Scalars['DateTime']['output']>;
  fixedValue: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  inventoryStatus: Scalars['String']['output'];
  isClaimed?: Maybe<Scalars['Boolean']['output']>;
  isFamilyFriendly: Scalars['Boolean']['output'];
  isNFTEnabled: Scalars['Boolean']['output'];
  joinLotteryProgram: Scalars['Boolean']['output'];
  lixiType: Scalars['Int']['output'];
  maxClaim: Scalars['Int']['output'];
  maxValue: Scalars['Int']['output'];
  minStaking: Scalars['Int']['output'];
  minValue: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  networkType?: Maybe<Scalars['String']['output']>;
  numberLixiPerPackage?: Maybe<Scalars['Int']['output']>;
  numberOfSubLixi?: Maybe<Scalars['Int']['output']>;
  packageId?: Maybe<Scalars['Int']['output']>;
  pageMessageSession?: Maybe<PageMessageSession>;
  parentId?: Maybe<Scalars['Int']['output']>;
  status: Scalars['String']['output'];
  subLixiBalance?: Maybe<Scalars['Int']['output']>;
  subLixiTotalClaim?: Maybe<Scalars['Int']['output']>;
  totalClaim: Scalars['Int']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type Location = {
  __typename?: 'Location';
  adminCode?: Maybe<Scalars['String']['output']>;
  adminNameAscii?: Maybe<Scalars['String']['output']>;
  cityAscii?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  iso2?: Maybe<Scalars['String']['output']>;
};

export type Message = {
  __typename?: 'Message';
  author: Account;
  body?: Maybe<Scalars['String']['output']>;
  /** Identifies the date and time when the object was created. */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  imageUploadable?: Maybe<ImageUploadable>;
  isPageOwner?: Maybe<Scalars['Boolean']['output']>;
  pageMessageSession?: Maybe<PageMessageSession>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type MessageConnection = {
  __typename?: 'MessageConnection';
  edges?: Maybe<Array<MessageEdge>>;
  pageInfo: PageInfo;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type MessageEdge = {
  __typename?: 'MessageEdge';
  cursor: Scalars['String']['output'];
  node: Message;
};

export type MessageOrder = {
  direction: OrderDirection;
  field: MessageOrderField;
};

/** Properties by which message connections can be ordered. */
export enum MessageOrderField {
  CreatedAt = 'createdAt',
  Id = 'id',
  UpdatedAt = 'updatedAt'
}

export type MessageSession = {
  __typename?: 'MessageSession';
  /** Identifies the date and time when the object was created. */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  lixi?: Maybe<LixiModel>;
  lixiAmount?: Maybe<Scalars['Int']['output']>;
  messages: Array<Message>;
  pageMessageSession?: Maybe<PageMessageSession>;
  sessionOpen?: Maybe<Scalars['Boolean']['output']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type MessageSessionEdge = {
  __typename?: 'MessageSessionEdge';
  cursor: Scalars['String']['output'];
  node: MessageSession;
};

export type Mutation = {
  __typename?: 'Mutation';
  UpdateOfferHideFromHome: Offer;
  allowOfferTakerChat: EscrowOrder;
  closePageMessageSession: PageMessageSession;
  create: Event;
  createBookmark: Bookmark;
  createBoost: BoostFee;
  createComment: Comment;
  createDispute: Dispute;
  createEscrowOrder: EscrowOrder;
  createFollowAccount: FollowAccount;
  createFollowPage: FollowPage;
  createFollowToken: FollowPage;
  createMessage: Message;
  createOffer: Post;
  createPage: Page;
  createPageMessageSession: PageMessageSession;
  createPoll: Post;
  createPost: Post;
  createProduct: Product;
  createReplyComment: Comment;
  createTemple: Temple;
  createToken: Token;
  createVote: PollAnswerOnAccount;
  createWorship: Worship;
  createWorshipTemple: Worship;
  createWorshipedPerson: WorshipedPerson;
  deleteFollowAccount: Scalars['Boolean']['output'];
  deleteFollowPage: Scalars['Boolean']['output'];
  deleteFollowToken: Scalars['Boolean']['output'];
  filterUtxos: Array<UtxoInNode>;
  markAsPaidOrder: EscrowOrder;
  openPageMessageSession: PageMessageSession;
  removeBookmark: Bookmark;
  removePost: Post;
  repost: Scalars['Boolean']['output'];
  updateAccount: Account;
  updateAccountTelegramUsername: Account;
  updateDispute: Dispute;
  updateEscrowOrderSignatory: EscrowOrder;
  updateEscrowOrderStatus: EscrowOrder;
  updateOffer: Offer;
  updateOfferStatus: Post;
  updatePage: Page;
  updatePost: Post;
};


export type MutationUpdateOfferHideFromHomeArgs = {
  data: UpdateOfferHideFromHomeInput;
};


export type MutationAllowOfferTakerChatArgs = {
  data: UpdateEscrowOrderInput;
};


export type MutationClosePageMessageSessionArgs = {
  data: ClosePageMessageSessionInput;
};


export type MutationCreateArgs = {
  data: CreateEventInput;
};


export type MutationCreateBookmarkArgs = {
  data: CreateBookmarkInput;
};


export type MutationCreateBoostArgs = {
  data: CreateBoostInput;
};


export type MutationCreateCommentArgs = {
  data: CreateCommentInput;
};


export type MutationCreateDisputeArgs = {
  data: CreateDisputeInput;
};


export type MutationCreateEscrowOrderArgs = {
  data: CreateEscrowOrderInput;
};


export type MutationCreateFollowAccountArgs = {
  data: CreateFollowAccountInput;
};


export type MutationCreateFollowPageArgs = {
  data: CreateFollowPageInput;
};


export type MutationCreateFollowTokenArgs = {
  data: CreateFollowTokenInput;
};


export type MutationCreateMessageArgs = {
  data: CreateMessageInput;
};


export type MutationCreateOfferArgs = {
  data: CreateOfferInput;
};


export type MutationCreatePageArgs = {
  data: CreatePageInput;
};


export type MutationCreatePageMessageSessionArgs = {
  data: CreatePageMessageInput;
};


export type MutationCreatePollArgs = {
  data: CreatePollInput;
};


export type MutationCreatePostArgs = {
  data: CreatePostInput;
};


export type MutationCreateProductArgs = {
  data: CreateProductInput;
};


export type MutationCreateReplyCommentArgs = {
  data: CreateCommentInput;
};


export type MutationCreateTempleArgs = {
  data: CreateTempleInput;
};


export type MutationCreateTokenArgs = {
  data: CreateTokenInput;
};


export type MutationCreateVoteArgs = {
  data: CreateVoteInput;
};


export type MutationCreateWorshipArgs = {
  data: CreateWorshipInput;
};


export type MutationCreateWorshipTempleArgs = {
  data: CreateWorshipInput;
};


export type MutationCreateWorshipedPersonArgs = {
  data: CreateWorshipedPersonInput;
};


export type MutationDeleteFollowAccountArgs = {
  data: DeleteFollowAccountInput;
};


export type MutationDeleteFollowPageArgs = {
  data: DeleteFollowPageInput;
};


export type MutationDeleteFollowTokenArgs = {
  data: DeleteFollowTokenInput;
};


export type MutationFilterUtxosArgs = {
  data: Array<UtxoInNodeInput>;
};


export type MutationMarkAsPaidOrderArgs = {
  data: UpdateEscrowOrderInput;
};


export type MutationOpenPageMessageSessionArgs = {
  data: OpenPageMessageSessionInput;
};


export type MutationRemoveBookmarkArgs = {
  data: RemoveBookmarkInput;
};


export type MutationRemovePostArgs = {
  data: RemovePostInput;
};


export type MutationRepostArgs = {
  data: RepostInput;
};


export type MutationUpdateAccountArgs = {
  data: UpdateAccountInput;
};


export type MutationUpdateAccountTelegramUsernameArgs = {
  telegramId: Scalars['String']['input'];
  telegramUsername: Scalars['String']['input'];
};


export type MutationUpdateDisputeArgs = {
  data: UpdateDisputeInput;
};


export type MutationUpdateEscrowOrderSignatoryArgs = {
  data: UpdateEscrowOrderSignatoryInput;
};


export type MutationUpdateEscrowOrderStatusArgs = {
  data: UpdateEscrowOrderInput;
};


export type MutationUpdateOfferArgs = {
  data: UpdateOfferInput;
};


export type MutationUpdateOfferStatusArgs = {
  data: UpdateOfferStatusInput;
};


export type MutationUpdatePageArgs = {
  data: UpdatePageInput;
};


export type MutationUpdatePostArgs = {
  data: UpdatePostInput;
};

export type Offer = {
  __typename?: 'Offer';
  coin: Coin;
  coinOthers?: Maybe<Scalars['String']['output']>;
  coinPayment?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Country>;
  countryId?: Maybe<Scalars['Int']['output']>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  escrowOrders?: Maybe<Array<EscrowOrder>>;
  hideFromHome?: Maybe<Scalars['Boolean']['output']>;
  localCurrency?: Maybe<Scalars['String']['output']>;
  location?: Maybe<Location>;
  locationId?: Maybe<Scalars['String']['output']>;
  marginPercentage: Scalars['Float']['output'];
  message: Scalars['String']['output'];
  noteOffer?: Maybe<Scalars['String']['output']>;
  orderLimitMax?: Maybe<Scalars['Float']['output']>;
  orderLimitMin?: Maybe<Scalars['Float']['output']>;
  paymentApp?: Maybe<Scalars['String']['output']>;
  paymentMethods: Array<OfferPaymentMethod>;
  paymentTypeGoodsServices?: Maybe<GoodsServicesPaymentType>;
  postId: Scalars['String']['output'];
  price: Scalars['String']['output'];
  priceCoinOthers?: Maybe<Scalars['Float']['output']>;
  priceGoodsServices?: Maybe<Scalars['Float']['output']>;
  publicKey: Scalars['String']['output'];
  state?: Maybe<State>;
  stateId?: Maybe<Scalars['Int']['output']>;
  status: OfferStatus;
  tickerPriceGoodsServices?: Maybe<Scalars['String']['output']>;
  type: OfferType;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type OfferBasicEdge = {
  __typename?: 'OfferBasicEdge';
  cursor: Scalars['String']['output'];
  node: Offer;
};

export type OfferFilterInput = {
  adminCode?: InputMaybe<Scalars['String']['input']>;
  amount?: InputMaybe<Scalars['Int']['input']>;
  cityName?: InputMaybe<Scalars['String']['input']>;
  coin?: InputMaybe<Scalars['String']['input']>;
  coinOthers?: InputMaybe<Scalars['String']['input']>;
  countryCode?: InputMaybe<Scalars['String']['input']>;
  countryName?: InputMaybe<Scalars['String']['input']>;
  fiatCurrency?: InputMaybe<Scalars['String']['input']>;
  isBuyOffer?: InputMaybe<Scalars['Boolean']['input']>;
  offerOrder?: InputMaybe<OfferOrder>;
  paymentApp?: InputMaybe<Scalars['String']['input']>;
  paymentMethodIds?: InputMaybe<Array<Scalars['Int']['input']>>;
  stateName?: InputMaybe<Scalars['String']['input']>;
  tickerPriceGoodsServices?: InputMaybe<Scalars['String']['input']>;
};

export type OfferOrder = {
  direction: OrderDirection;
  field: OfferOrderField;
};

/** Properties by which offer connections can be ordered. */
export enum OfferOrderField {
  DonationAmount = 'donationAmount',
  Price = 'price',
  Relevance = 'relevance',
  Trades = 'trades'
}

export type OfferPaymentMethod = {
  __typename?: 'OfferPaymentMethod';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  offer: Offer;
  offerId: Scalars['String']['output'];
  paymentMethod: PaymentMethod;
  paymentMethodId: Scalars['Int']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

/** The status of offer. */
export enum OfferStatus {
  Active = 'ACTIVE',
  Archive = 'ARCHIVE'
}

/** The type of offer. */
export enum OfferType {
  Buy = 'BUY',
  Sell = 'SELL'
}

export type OpenPageMessageSessionInput = {
  pageMessageSessionId: Scalars['String']['input'];
};

/** Possible directions in which to order a list of items when provided an `orderBy` argument. */
export enum OrderDirection {
  Asc = 'asc',
  Desc = 'desc'
}

export type Page = {
  __typename?: 'Page';
  accessMessageFee?: Maybe<Scalars['Float']['output']>;
  address?: Maybe<Scalars['String']['output']>;
  avatar?: Maybe<Scalars['String']['output']>;
  avatarImageUplodableId?: Maybe<Scalars['String']['output']>;
  category?: Maybe<Category>;
  categoryId?: Maybe<Scalars['Int']['output']>;
  countryId?: Maybe<Scalars['Int']['output']>;
  countryName?: Maybe<Scalars['String']['output']>;
  cover?: Maybe<Scalars['String']['output']>;
  coverImageUplodableId?: Maybe<Scalars['String']['output']>;
  createCommentFee: Scalars['String']['output'];
  createPostFee: Scalars['String']['output'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  dana?: Maybe<PageDana>;
  description: Scalars['String']['output'];
  encryptedMnemonic?: Maybe<Scalars['String']['output']>;
  followerFreeMessage?: Maybe<Scalars['Boolean']['output']>;
  followersCount?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  minDanaForMessage?: Maybe<Scalars['Float']['output']>;
  name: Scalars['String']['output'];
  pageAccount: Account;
  pageAccountId: Scalars['Int']['output'];
  pageMessageSessions?: Maybe<Array<PageMessageSession>>;
  parent?: Maybe<Page>;
  parentId?: Maybe<Scalars['String']['output']>;
  salt?: Maybe<Scalars['String']['output']>;
  stateId?: Maybe<Scalars['Int']['output']>;
  stateName?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  /** The sum of burn amount for every post on page */
  totalBurnForPage?: Maybe<Scalars['Float']['output']>;
  totalDanaViewScore?: Maybe<Scalars['Int']['output']>;
  totalPostsBurnDown: Scalars['Float']['output'];
  totalPostsBurnScore: Scalars['Float']['output'];
  totalPostsBurnUp: Scalars['Float']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  website?: Maybe<Scalars['String']['output']>;
};

export type PageBasicConnection = {
  __typename?: 'PageBasicConnection';
  edges: Array<PageBasicEdge>;
  pageInfo: BasicPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type PageBasicEdge = {
  __typename?: 'PageBasicEdge';
  cursor: Scalars['String']['output'];
  node: Page;
};

export type PageDana = {
  __typename?: 'PageDana';
  danaBurnDown: Scalars['Float']['output'];
  danaBurnScore: Scalars['Float']['output'];
  danaBurnUp: Scalars['Float']['output'];
  danaReceivedDown: Scalars['Float']['output'];
  danaReceivedScore: Scalars['Float']['output'];
  danaReceivedUp: Scalars['Float']['output'];
  page: Page;
  pageId: Scalars['String']['output'];
  version: Scalars['Int']['output'];
};

export type PageEdge = {
  __typename?: 'PageEdge';
  cursor: Scalars['String']['output'];
  node: Page;
};

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type PageMessageSession = {
  __typename?: 'PageMessageSession';
  account: Account;
  /** Identifies the date and time when the object was created. */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  latestMessage?: Maybe<LatestMessage>;
  lixi?: Maybe<LixiModel>;
  lixiClaimCode?: Maybe<Scalars['String']['output']>;
  messages?: Maybe<Array<Message>>;
  page: Page;
  /** Identifies the date and time when the session was closed. */
  sessionClosedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Identifies the date and time when the session was opened. */
  sessionOpenedAt?: Maybe<Scalars['DateTime']['output']>;
  status: PageMessageSessionStatus;
  /** Identifies the date and time when the object was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type PageMessageSessionConnection = {
  __typename?: 'PageMessageSessionConnection';
  edges?: Maybe<Array<PageMessageSessionEdge>>;
  pageInfo: PageInfo;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type PageMessageSessionEdge = {
  __typename?: 'PageMessageSessionEdge';
  cursor: Scalars['String']['output'];
  node: PageMessageSession;
};

export type PageMessageSessionOrder = {
  direction: OrderDirection;
  field: PageMessageSessionOrderField;
};

/** Properties by which page message session connections can be ordered. */
export enum PageMessageSessionOrderField {
  CreatedAt = 'createdAt',
  Id = 'id',
  Status = 'status',
  UpdatedAt = 'updatedAt'
}

/** Properties by status of the current PageMessageSession. */
export enum PageMessageSessionStatus {
  Close = 'CLOSE',
  Open = 'OPEN',
  Pending = 'PENDING'
}

export type PaymentMethod = {
  __typename?: 'PaymentMethod';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  escrowOrders?: Maybe<Array<EscrowOrder>>;
  id: Scalars['Int']['output'];
  message?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  offerPaymentMethods?: Maybe<Array<OfferPaymentMethod>>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type Poll = {
  __typename?: 'Poll';
  canAddOption: Scalars['Boolean']['output'];
  defaultOptions?: Maybe<Array<Scalars['String']['output']>>;
  endDate: Scalars['DateTime']['output'];
  options: Array<PollOption>;
  postId: Scalars['String']['output'];
  question: Scalars['String']['output'];
  singleSelect: Scalars['Boolean']['output'];
  startDate: Scalars['DateTime']['output'];
  totalVote?: Maybe<Scalars['Int']['output']>;
};

export type PollAnswerOnAccount = {
  __typename?: 'PollAnswerOnAccount';
  account?: Maybe<Account>;
  accountId: Scalars['Int']['output'];
  pollDanaScore: Scalars['Float']['output'];
};

export type PollOption = {
  __typename?: 'PollOption';
  danaScoreOption?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  option: Scalars['String']['output'];
  pollAnswerOnAccount?: Maybe<Array<PollAnswerOnAccount>>;
  pollId: Scalars['String']['output'];
};

export type PollOptionInput = {
  option: Scalars['String']['input'];
  pollId?: InputMaybe<Scalars['String']['input']>;
};

export type Post = {
  __typename?: 'Post';
  account: Account;
  accountId: Scalars['Int']['output'];
  bookmarkableId?: Maybe<Scalars['String']['output']>;
  boostScore?: Maybe<PostBoost>;
  burnedByOthers?: Maybe<Scalars['Boolean']['output']>;
  commentableId?: Maybe<Scalars['String']['output']>;
  content: Scalars['String']['output'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  dana?: Maybe<PostDana>;
  danaViewScore?: Maybe<Scalars['Float']['output']>;
  followPostOwner?: Maybe<Scalars['Boolean']['output']>;
  followedPage?: Maybe<Scalars['Boolean']['output']>;
  followedToken?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['ID']['output'];
  imageUploadable?: Maybe<ImageUploadable>;
  isBookmarked?: Maybe<Scalars['Boolean']['output']>;
  offer?: Maybe<Offer>;
  originalLanguage?: Maybe<Scalars['String']['output']>;
  page?: Maybe<Page>;
  pageId?: Maybe<Scalars['String']['output']>;
  poll?: Maybe<Poll>;
  postHashtags?: Maybe<Array<PostHashtag>>;
  repostCount: Scalars['Int']['output'];
  reposts?: Maybe<Array<Repost>>;
  taggableId?: Maybe<Scalars['String']['output']>;
  token?: Maybe<Token>;
  tokenId?: Maybe<Scalars['String']['output']>;
  totalComments: Scalars['Int']['output'];
  translations?: Maybe<Array<PostTranslation>>;
  type: Scalars['String']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type PostBoost = {
  __typename?: 'PostBoost';
  boostDown: Scalars['Float']['output'];
  boostReceivedDown: Scalars['Float']['output'];
  boostReceivedScore: Scalars['Float']['output'];
  boostReceivedUp: Scalars['Float']['output'];
  boostScore: Scalars['Float']['output'];
  boostUp: Scalars['Float']['output'];
  post: Post;
  postId: Scalars['String']['output'];
  version: Scalars['Int']['output'];
};

export type PostConnection = {
  __typename?: 'PostConnection';
  edges?: Maybe<Array<PostEdge>>;
  pageInfo: PageInfo;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type PostDana = {
  __typename?: 'PostDana';
  danaBurnDown: Scalars['Float']['output'];
  danaBurnScore: Scalars['Float']['output'];
  danaBurnUp: Scalars['Float']['output'];
  danaReceivedDown: Scalars['Float']['output'];
  danaReceivedScore: Scalars['Float']['output'];
  danaReceivedUp: Scalars['Float']['output'];
  post: Post;
  postId: Scalars['String']['output'];
  version: Scalars['Int']['output'];
};

export type PostEdge = {
  __typename?: 'PostEdge';
  cursor: Scalars['String']['output'];
  node: Post;
};

export type PostHashtag = {
  __typename?: 'PostHashtag';
  /** Identifies the date and time when the object was created. */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  hashtag: Hashtag;
  hashtagId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  post?: Maybe<Post>;
  postId?: Maybe<Scalars['String']['output']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type PostOrder = {
  direction: OrderDirection;
  field: PostOrderField;
};

/** Properties by which post connections can be ordered. */
export enum PostOrderField {
  Content = 'content',
  CreatedAt = 'createdAt',
  DanaBurnScore = 'danaBurnScore',
  Id = 'id',
  LastRepostAt = 'lastRepostAt',
  UpdatedAt = 'updatedAt'
}

export type PostTranslation = {
  __typename?: 'PostTranslation';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  translateContent?: Maybe<Scalars['String']['output']>;
  translateLanguage?: Maybe<Scalars['String']['output']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type Product = {
  __typename?: 'Product';
  account: Account;
  accountId: Scalars['Int']['output'];
  address?: Maybe<Scalars['String']['output']>;
  categoryId?: Maybe<Scalars['Int']['output']>;
  country?: Maybe<Country>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  dana?: Maybe<ProductDana>;
  danaViewScore: Scalars['Int']['output'];
  description: Scalars['String']['output'];
  followOwner: Scalars['Boolean']['output'];
  followedPage: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  imageUploadable?: Maybe<ImageUploadable>;
  imageUploadableId?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  page?: Maybe<Page>;
  pageId?: Maybe<Scalars['String']['output']>;
  phoneNumber: Scalars['String']['output'];
  price: Scalars['Int']['output'];
  priceUnit: Scalars['String']['output'];
  state?: Maybe<State>;
  title: Scalars['String']['output'];
  token?: Maybe<Token>;
  tokenId?: Maybe<Scalars['String']['output']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type ProductDana = {
  __typename?: 'ProductDana';
  danaBurnDown: Scalars['Float']['output'];
  danaBurnScore: Scalars['Float']['output'];
  danaBurnUp: Scalars['Float']['output'];
  danaReceivedDown: Scalars['Float']['output'];
  danaReceivedScore: Scalars['Float']['output'];
  danaReceivedUp: Scalars['Float']['output'];
  product: Product;
  productId: Scalars['String']['output'];
  version: Scalars['Int']['output'];
};

export type ProductEdge = {
  __typename?: 'ProductEdge';
  cursor: Scalars['String']['output'];
  node: Product;
};

export type Query = {
  __typename?: 'Query';
  account: Account;
  allAccounts: AccountBasicConnection;
  allClosedPageMessageSession: PageMessageSessionConnection;
  allDisputeByAccount: TimelineItemConnection;
  allEscrowOrderByAccount: EscrowOrderConnection;
  allEscrowOrderByOfferId: TimelineItemConnection;
  allFollowersByFollowing: AccountConnection;
  allFollowersByPage: AccountBasicConnection;
  allFollowersByToken: AccountBasicConnection;
  allFollowingsByFollower: AccountConnection;
  allHashtag: HashtagConnection;
  allHashtagByPage: HashtagConnection;
  allHashtagBySearch: HashtagConnection;
  allHashtagByToken: HashtagConnection;
  allMessageByPageMessageSessionId: MessageConnection;
  allOffer: TimelineItemConnection;
  allOfferActiveByAccountId: TimelineItemConnection;
  allOfferActiveByAccountIdDatabase: TimelineItemConnection;
  allOfferByAccount: TimelineItemConnection;
  allOfferByAccountDatabase: TimelineItemConnection;
  allOpenPageMessageSessionByAccountId: PageMessageSessionConnection;
  allOpenPageMessageSessionByPageId: PageMessageSessionConnection;
  allPageMessageSessionByAccountId: PageMessageSessionConnection;
  allPages: PageBasicConnection;
  allPagesByUserId: PageBasicConnection;
  allPaymenMethod: Array<PaymentMethod>;
  allPendingPageMessageSessionByAccountId: PageMessageSessionConnection;
  allPendingPageMessageSessionByPageId: PageMessageSessionConnection;
  allPostsByHashtagId: PostConnection;
  allPostsByPageId: PostConnection;
  allPostsBySearch: PostConnection;
  allPostsBySearchWithHashtag: PostConnection;
  allPostsBySearchWithHashtagAtPage: PostConnection;
  allPostsBySearchWithHashtagAtToken: PostConnection;
  allPostsByTokenId: PostConnection;
  allPostsByUserId: PostConnection;
  allTemple: TempleConnection;
  allTempleBySearch: TempleConnection;
  allTokens: TokenConnection;
  allWorship: WorshipConnection;
  allWorshipedByPersonId: WorshipConnection;
  allWorshipedByTempleId: WorshipConnection;
  allWorshipedPerson: WorshipedPersonConnection;
  allWorshipedPersonBySearch: WorshipedPersonConnection;
  allWorshipedPersonByUserId: WorshipedPersonConnection;
  allWorshipedPersonSpecialDate: WorshipedPersonConnection;
  arbiRequestTelegramChat: Scalars['Boolean']['output'];
  bookmark: Bookmark;
  bookmarkTimeline: TimelineItemConnection;
  checkIfFollowAccount: Scalars['Boolean']['output'];
  checkIfFollowPage: Scalars['Boolean']['output'];
  checkIfFollowToken: Scalars['Boolean']['output'];
  comment: Comment;
  commentsToCommentableId: CommentConnection;
  convertDanaToCoin: Scalars['Float']['output'];
  dispute: Dispute;
  escrowOrder: EscrowOrder;
  getAccountByAddress: Account;
  getAllFiatRate: Array<AllFiatRates>;
  getBalances: Balances;
  getFiatRate: Array<FiatRates>;
  getLocaleCashAvatar?: Maybe<Scalars['String']['output']>;
  getModeratorAccount: Account;
  getRandomArbitratorAccount: Account;
  hashtag: Hashtag;
  homeTimeline: TimelineItemConnection;
  message: Message;
  offer: Offer;
  offerByFilter: TimelineItemConnection;
  offerByFilterDatabase: TimelineItemConnection;
  page: Page;
  pageMessageSession: PageMessageSession;
  pageTimeline: TimelineItemConnection;
  pageTimelineByTime: TimelineItemConnection;
  pagesByFollower: PageBasicConnection;
  poll: Poll;
  post: Post;
  postBurnHistory: BurnBasicConnection;
  product: Product;
  profileTimeline: TimelineItemConnection;
  profileTimelineByTime: TimelineItemConnection;
  temple: Temple;
  timeline: TimelineItem;
  token: Token;
  tokenByTokenId: Token;
  tokenTimeline: TimelineItemConnection;
  tokenTimelineByTime: TimelineItemConnection;
  topMonthAccountDanaGiven: AccountBasicConnection;
  topWeekAccountDanaGiven: AccountBasicConnection;
  userHadMessageToPage?: Maybe<PageMessageSession>;
  userRequestTelegramChat: Scalars['Boolean']['output'];
  worship: Worship;
  worshipedPerson: WorshipedPerson;
};


export type QueryAccountArgs = {
  id: Scalars['Int']['input'];
};


export type QueryAllAccountsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllClosedPageMessageSessionArgs = {
  accountId?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PageMessageSessionOrder>;
  pageId?: InputMaybe<Scalars['String']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllDisputeByAccountArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  disputeStatus: DisputeStatus;
  first?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllEscrowOrderByAccountArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  escrowOrderStatus: EscrowOrderStatus;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllEscrowOrderByOfferIdArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  escrowOrderStatus: EscrowOrderStatus;
  first?: InputMaybe<Scalars['Int']['input']>;
  offerId: Scalars['String']['input'];
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllFollowersByFollowingArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  followingAccountId?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<AccountOrder>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllFollowersByPageArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllFollowersByTokenArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllFollowingsByFollowerArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  followerAccountId?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<AccountOrder>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllHashtagArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<HashtagOrder>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllHashtagByPageArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<HashtagOrder>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllHashtagBySearchArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAllHashtagByTokenArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<HashtagOrder>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllMessageByPageMessageSessionIdArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<MessageOrder>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllOfferArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllOfferActiveByAccountIdArgs = {
  accountId: Scalars['Int']['input'];
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllOfferActiveByAccountIdDatabaseArgs = {
  accountId: Scalars['Int']['input'];
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllOfferByAccountArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  offerStatus: OfferStatus;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllOfferByAccountDatabaseArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  offerStatus: OfferStatus;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllOpenPageMessageSessionByAccountIdArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PageMessageSessionOrder>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllOpenPageMessageSessionByPageIdArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PageMessageSessionOrder>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllPageMessageSessionByAccountIdArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PageMessageSessionOrder>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllPagesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllPagesByUserIdArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllPendingPageMessageSessionByAccountIdArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PageMessageSessionOrder>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllPendingPageMessageSessionByPageIdArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PageMessageSessionOrder>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllPostsByHashtagIdArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PostOrder>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllPostsByPageIdArgs = {
  accountId?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<PostOrder>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllPostsBySearchArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAllPostsBySearchWithHashtagArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  hashtags?: InputMaybe<Array<Scalars['String']['input']>>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PostOrder>;
  query?: InputMaybe<Scalars['String']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllPostsBySearchWithHashtagAtPageArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  hashtags?: InputMaybe<Array<Scalars['String']['input']>>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PostOrder>;
  pageId?: InputMaybe<Scalars['String']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAllPostsBySearchWithHashtagAtTokenArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  hashtags?: InputMaybe<Array<Scalars['String']['input']>>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PostOrder>;
  query?: InputMaybe<Scalars['String']['input']>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAllPostsByTokenIdArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PostOrder>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllPostsByUserIdArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<PostOrder>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllTempleArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<TempleOrder>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllTempleBySearchArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAllTokensArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllWorshipArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<WorshipOrder>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllWorshipedByPersonIdArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<WorshipOrder>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllWorshipedByTempleIdArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<WorshipOrder>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllWorshipedPersonArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<WorshipedPersonOrder>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllWorshipedPersonBySearchArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAllWorshipedPersonByUserIdArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<WorshipedPersonOrder>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAllWorshipedPersonSpecialDateArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<WorshipedPersonOrder>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryArbiRequestTelegramChatArgs = {
  escrowOrderId: Scalars['String']['input'];
  requestChatPublicKey: Scalars['String']['input'];
};


export type QueryBookmarkArgs = {
  id: Scalars['String']['input'];
};


export type QueryBookmarkTimelineArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['Int']['input'];
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCheckIfFollowAccountArgs = {
  followingAccountId: Scalars['Int']['input'];
};


export type QueryCheckIfFollowPageArgs = {
  pageId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryCheckIfFollowTokenArgs = {
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryCommentArgs = {
  id: Scalars['String']['input'];
};


export type QueryCommentsToCommentableIdArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<CommentOrder>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryConvertDanaToCoinArgs = {
  ConvertDanaInput: ConvertDana;
};


export type QueryDisputeArgs = {
  id: Scalars['String']['input'];
};


export type QueryEscrowOrderArgs = {
  id: Scalars['String']['input'];
};


export type QueryGetAccountByAddressArgs = {
  address: Scalars['String']['input'];
};


export type QueryGetBalancesArgs = {
  address: Scalars['String']['input'];
};


export type QueryGetLocaleCashAvatarArgs = {
  accountId: Scalars['Int']['input'];
};


export type QueryGetRandomArbitratorAccountArgs = {
  offerId: Scalars['String']['input'];
};


export type QueryHashtagArgs = {
  content: Scalars['String']['input'];
};


export type QueryHomeTimelineArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  level?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMessageArgs = {
  id: Scalars['String']['input'];
};


export type QueryOfferArgs = {
  id: Scalars['String']['input'];
};


export type QueryOfferByFilterArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  offerFilterInput: OfferFilterInput;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryOfferByFilterDatabaseArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  offerFilterInput: OfferFilterInput;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryPageArgs = {
  id: Scalars['String']['input'];
};


export type QueryPageMessageSessionArgs = {
  id: Scalars['String']['input'];
};


export type QueryPageTimelineArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['String']['input'];
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryPageTimelineByTimeArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['String']['input'];
  minimumDanaFilter: Scalars['Int']['input'];
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryPagesByFollowerArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryPollArgs = {
  id: Scalars['String']['input'];
};


export type QueryPostArgs = {
  id: Scalars['String']['input'];
};


export type QueryPostBurnHistoryArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['String']['input'];
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryProductArgs = {
  id: Scalars['String']['input'];
};


export type QueryProfileTimelineArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['Int']['input'];
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryProfileTimelineByTimeArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['Int']['input'];
  minimumDanaFilter: Scalars['Int']['input'];
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryTempleArgs = {
  id: Scalars['String']['input'];
};


export type QueryTimelineArgs = {
  id: Scalars['String']['input'];
};


export type QueryTokenArgs = {
  id: Scalars['String']['input'];
};


export type QueryTokenByTokenIdArgs = {
  tokenId: Scalars['String']['input'];
};


export type QueryTokenTimelineArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['String']['input'];
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryTokenTimelineByTimeArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['String']['input'];
  minimumDanaFilter: Scalars['Int']['input'];
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryTopMonthAccountDanaGivenArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  month: Scalars['Int']['input'];
  skip?: InputMaybe<Scalars['Int']['input']>;
  year: Scalars['Int']['input'];
};


export type QueryTopWeekAccountDanaGivenArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  minBurnFilter?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  week: Scalars['Int']['input'];
  year: Scalars['Int']['input'];
};


export type QueryUserHadMessageToPageArgs = {
  accountId?: InputMaybe<Scalars['Int']['input']>;
  pageId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryUserRequestTelegramChatArgs = {
  id: Scalars['String']['input'];
};


export type QueryWorshipArgs = {
  id: Scalars['String']['input'];
};


export type QueryWorshipedPersonArgs = {
  id: Scalars['String']['input'];
};

export type RateEntry = {
  __typename?: 'RateEntry';
  rate: Scalars['Float']['output'];
  ts: Scalars['Float']['output'];
};

export type RemoveBookmarkInput = {
  accountId: Scalars['Int']['input'];
  bookmarkForId: Scalars['String']['input'];
};

export type RemovePostInput = {
  accountId: Scalars['Int']['input'];
  postId: Scalars['String']['input'];
};

export type Repost = {
  __typename?: 'Repost';
  account?: Maybe<Account>;
  accountId?: Maybe<Scalars['Int']['output']>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  id?: Maybe<Scalars['ID']['output']>;
  post?: Maybe<Post>;
  postId?: Maybe<Scalars['String']['output']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type RepostInput = {
  accountId: Scalars['Int']['input'];
  postId: Scalars['String']['input'];
  txHex?: InputMaybe<Scalars['String']['input']>;
};

/** The role of account. */
export enum Role {
  Arbitrator = 'ARBITRATOR',
  Moderator = 'MODERATOR',
  User = 'USER'
}

export type State = {
  __typename?: 'State';
  city: Array<City>;
  country: City;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
};

export type Subscription = {
  __typename?: 'Subscription';
  bookmarkCreated: Bookmark;
  hashtagCreated: Hashtag;
  messageCreated: Message;
  pageMessageSessionCreated: PageMessageSession;
  templeCreated: Temple;
  worshipedPersonCreated: WorshipedPerson;
};

export type Temple = {
  __typename?: 'Temple';
  account: Account;
  achievement?: Maybe<Scalars['String']['output']>;
  address?: Maybe<Scalars['String']['output']>;
  alias?: Maybe<Scalars['String']['output']>;
  avatar?: Maybe<UploadDetail>;
  city?: Maybe<City>;
  country?: Maybe<Country>;
  cover?: Maybe<UploadDetail>;
  /** Identifies the date and time when the object was created. */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  dateOfCompleted?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  president?: Maybe<Scalars['String']['output']>;
  religion?: Maybe<Scalars['String']['output']>;
  state?: Maybe<State>;
  totalWorshipAmount?: Maybe<Scalars['Int']['output']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  verified: Scalars['Boolean']['output'];
  website?: Maybe<Scalars['String']['output']>;
};

export type TempleConnection = {
  __typename?: 'TempleConnection';
  edges?: Maybe<Array<TempleEdge>>;
  pageInfo: PageInfo;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type TempleEdge = {
  __typename?: 'TempleEdge';
  cursor: Scalars['String']['output'];
  node: Temple;
};

export type TempleOrder = {
  direction: OrderDirection;
  field: TempleOrderField;
};

/** Properties by which temple connections can be ordered. */
export enum TempleOrderField {
  CreatedAt = 'createdAt',
  Id = 'id',
  TotalWorshipAmount = 'totalWorshipAmount',
  UpdatedAt = 'updatedAt'
}

export type TimelineItem = {
  __typename?: 'TimelineItem';
  data: TimelineItemData;
  id: Scalars['ID']['output'];
};

export type TimelineItemBasicEdge = {
  __typename?: 'TimelineItemBasicEdge';
  cursor: Scalars['String']['output'];
  node: TimelineItem;
};

export type TimelineItemConnection = {
  __typename?: 'TimelineItemConnection';
  edges: Array<TimelineItemBasicEdge>;
  pageInfo: BasicPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type TimelineItemData = Dispute | EscrowOrder | Post;

export type Token = {
  __typename?: 'Token';
  /** Identifies the date and time when the object was last comments. */
  comments?: Maybe<Scalars['DateTime']['output']>;
  /** Identifies the date and time when the object was created. */
  createdDate: Scalars['DateTime']['output'];
  dana?: Maybe<TokenDana>;
  decimals: Scalars['Int']['output'];
  followersCount?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  initialTokenQuantity?: Maybe<Scalars['String']['output']>;
  isFollowed?: Maybe<Scalars['Boolean']['output']>;
  name: Scalars['String']['output'];
  rank?: Maybe<Scalars['Int']['output']>;
  ticker: Scalars['String']['output'];
  tokenDocumentUrl?: Maybe<Scalars['String']['output']>;
  tokenId: Scalars['String']['output'];
  tokenType: Scalars['String']['output'];
  totalBurned?: Maybe<Scalars['String']['output']>;
  totalDanaViewScore?: Maybe<Scalars['Int']['output']>;
  totalMinted?: Maybe<Scalars['String']['output']>;
};

export type TokenBasicEdge = {
  __typename?: 'TokenBasicEdge';
  cursor: Scalars['String']['output'];
  node: Token;
};

export type TokenConnection = {
  __typename?: 'TokenConnection';
  edges: Array<TokenBasicEdge>;
  pageInfo: BasicPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type TokenDana = {
  __typename?: 'TokenDana';
  danaBurnDown: Scalars['Float']['output'];
  danaBurnScore: Scalars['Float']['output'];
  danaBurnUp: Scalars['Float']['output'];
  danaReceivedDown: Scalars['Float']['output'];
  danaReceivedScore: Scalars['Float']['output'];
  danaReceivedUp: Scalars['Float']['output'];
  token: Token;
  tokenId: Scalars['String']['output'];
  version: Scalars['Int']['output'];
};

export type UpdateAccountInput = {
  avatar?: InputMaybe<Scalars['String']['input']>;
  birthday?: InputMaybe<Scalars['DateTime']['input']>;
  cover?: InputMaybe<Scalars['String']['input']>;
  createCommentFee?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['Int']['input'];
  language?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateDisputeInput = {
  escrowOrderId: Scalars['String']['input'];
  id: Scalars['String']['input'];
  status: DisputeStatus;
};

export type UpdateEscrowOrderInput = {
  allowOfferTakerChat?: InputMaybe<Scalars['Boolean']['input']>;
  amount?: InputMaybe<Scalars['Float']['input']>;
  buyerDepositFeeOutIdx?: InputMaybe<Scalars['Int']['input']>;
  buyerDepositFeeValue?: InputMaybe<Scalars['Int']['input']>;
  buyerDonateAmount?: InputMaybe<Scalars['Float']['input']>;
  feeOutIdx?: InputMaybe<Scalars['Int']['input']>;
  feeTxid?: InputMaybe<Scalars['String']['input']>;
  feeValue?: InputMaybe<Scalars['Int']['input']>;
  markAsPaid?: InputMaybe<Scalars['Boolean']['input']>;
  orderId: Scalars['String']['input'];
  outIdx?: InputMaybe<Scalars['Int']['input']>;
  price?: InputMaybe<Scalars['String']['input']>;
  returnBuyerDepositFeeTxid?: InputMaybe<Scalars['String']['input']>;
  returnFeeTxid?: InputMaybe<Scalars['String']['input']>;
  sellerDonateAmount?: InputMaybe<Scalars['Float']['input']>;
  socketId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<EscrowOrderStatus>;
  txid?: InputMaybe<Scalars['String']['input']>;
  utxoInNodeOfBuyer?: InputMaybe<UtxoInNodeInput>;
  value?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateEscrowOrderSignatoryInput = {
  action: EscrowOrderAction;
  buyerDonateAmount?: InputMaybe<Scalars['Float']['input']>;
  orderId: Scalars['String']['input'];
  sellerDonateAmount?: InputMaybe<Scalars['Float']['input']>;
  signatory: Scalars['String']['input'];
  signatoryOwnerBuyerDepositFeeHash160?: InputMaybe<Scalars['String']['input']>;
  signatoryOwnerFeeHash160?: InputMaybe<Scalars['String']['input']>;
  signatoryOwnerHash160?: InputMaybe<Scalars['String']['input']>;
  socketId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOfferHideFromHomeInput = {
  hideFromHome: Scalars['Boolean']['input'];
  id: Scalars['String']['input'];
};

export type UpdateOfferInput = {
  id: Scalars['String']['input'];
  marginPercentage?: InputMaybe<Scalars['Float']['input']>;
  message?: InputMaybe<Scalars['String']['input']>;
  noteOffer?: InputMaybe<Scalars['String']['input']>;
  orderLimitMax?: InputMaybe<Scalars['Float']['input']>;
  orderLimitMin?: InputMaybe<Scalars['Float']['input']>;
  priceCoinOthers?: InputMaybe<Scalars['Float']['input']>;
  priceGoodsServices?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateOfferStatusInput = {
  id: Scalars['String']['input'];
  status?: InputMaybe<OfferStatus>;
};

export type UpdatePageInput = {
  address?: InputMaybe<Scalars['String']['input']>;
  avatar?: InputMaybe<Scalars['String']['input']>;
  categoryId?: InputMaybe<Scalars['String']['input']>;
  countryId?: InputMaybe<Scalars['String']['input']>;
  cover?: InputMaybe<Scalars['String']['input']>;
  createCommentFee?: InputMaybe<Scalars['String']['input']>;
  createPostFee?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  parentId?: InputMaybe<Scalars['String']['input']>;
  stateId?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePostInput = {
  extraArguments?: InputMaybe<ExtraArguments>;
  htmlContent: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  pureContent: Scalars['String']['input'];
};

export type Upload = {
  __typename?: 'Upload';
  bucket?: Maybe<Scalars['String']['output']>;
  cfImageFilename?: Maybe<Scalars['String']['output']>;
  cfImageId?: Maybe<Scalars['String']['output']>;
  commentId?: Maybe<Scalars['String']['output']>;
  extension?: Maybe<Scalars['String']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  sha: Scalars['String']['output'];
  thumbnailHeight?: Maybe<Scalars['Int']['output']>;
  thumbnailWidth?: Maybe<Scalars['Int']['output']>;
  type?: Maybe<Scalars['String']['output']>;
  width?: Maybe<Scalars['Int']['output']>;
};

export type UploadDetail = {
  __typename?: 'UploadDetail';
  account?: Maybe<Account>;
  accountId?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  postId?: Maybe<Scalars['String']['output']>;
  upload: Upload;
};

export type UtxoInNode = {
  __typename?: 'UtxoInNode';
  outIdx: Scalars['Int']['output'];
  txid: Scalars['String']['output'];
  value: Scalars['Int']['output'];
};

export type UtxoInNodeInput = {
  outIdx: Scalars['Int']['input'];
  txid: Scalars['String']['input'];
  value: Scalars['Int']['input'];
};

export type Worship = {
  __typename?: 'Worship';
  account: Account;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  latitude?: Maybe<Scalars['Decimal']['output']>;
  location?: Maybe<Scalars['String']['output']>;
  longitude?: Maybe<Scalars['Decimal']['output']>;
  temple?: Maybe<Temple>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  worshipedAmount: Scalars['Float']['output'];
  worshipedPerson?: Maybe<WorshipedPerson>;
};

export type WorshipConnection = {
  __typename?: 'WorshipConnection';
  edges?: Maybe<Array<WorshipEdge>>;
  pageInfo: PageInfo;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type WorshipEdge = {
  __typename?: 'WorshipEdge';
  cursor: Scalars['String']['output'];
  node: Worship;
};

export type WorshipOrder = {
  direction: OrderDirection;
  field: WorshipOrderField;
};

/** Properties by which worship connections can be ordered. */
export enum WorshipOrderField {
  CreatedAt = 'createdAt',
  Id = 'id',
  UpdatedAt = 'updatedAt',
  WorshipedAmount = 'worshipedAmount'
}

export type WorshipedPerson = {
  __typename?: 'WorshipedPerson';
  achievement?: Maybe<Scalars['String']['output']>;
  alias?: Maybe<Scalars['String']['output']>;
  avatar?: Maybe<UploadDetail>;
  bio?: Maybe<Scalars['String']['output']>;
  city?: Maybe<City>;
  country?: Maybe<Country>;
  countryOfCitizenship?: Maybe<Scalars['String']['output']>;
  /** Identifies the date and time when the object was created. */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  dateOfBirth?: Maybe<Scalars['DateTime']['output']>;
  dateOfDeath?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  placeOfBirth?: Maybe<Scalars['String']['output']>;
  placeOfBurial?: Maybe<Scalars['String']['output']>;
  placeOfDeath?: Maybe<Scalars['String']['output']>;
  quote?: Maybe<Scalars['String']['output']>;
  religion?: Maybe<Scalars['String']['output']>;
  state?: Maybe<State>;
  totalWorshipAmount?: Maybe<Scalars['Int']['output']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  wikiAvatar?: Maybe<Scalars['String']['output']>;
  wikiDataId?: Maybe<Scalars['String']['output']>;
};

export type WorshipedPersonConnection = {
  __typename?: 'WorshipedPersonConnection';
  edges?: Maybe<Array<WorshipedPersonEdge>>;
  pageInfo: PageInfo;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type WorshipedPersonEdge = {
  __typename?: 'WorshipedPersonEdge';
  cursor: Scalars['String']['output'];
  node: WorshipedPerson;
};

export type WorshipedPersonOrder = {
  direction: OrderDirection;
  field: WorshipedPersonOrderField;
};

/** Properties by which worshiped person connections can be ordered. */
export enum WorshipedPersonOrderField {
  CreatedAt = 'createdAt',
  Id = 'id',
  TotalWorshipAmount = 'totalWorshipAmount',
  UpdatedAt = 'updatedAt'
}
