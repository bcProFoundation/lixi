export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  /** A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the `date-time` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar. */
  DateTime: any;
  /** An arbitrary-precision Decimal type */
  Decimal: any;
};

export type Account = {
  __typename?: 'Account';
  accountDana?: Maybe<AccountDana>;
  address: Scalars['String'];
  avatar?: Maybe<Scalars['String']>;
  balance: Scalars['Int'];
  cover?: Maybe<Scalars['String']>;
  createCommentFee?: Maybe<Scalars['String']>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime'];
  dayOfBirth?: Maybe<Scalars['Int']>;
  description?: Maybe<Scalars['String']>;
  encryptedMnemonic?: Maybe<Scalars['String']>;
  encryptedSecret?: Maybe<Scalars['String']>;
  followersCount?: Maybe<Scalars['Int']>;
  followingPagesCount?: Maybe<Scalars['Int']>;
  followingsCount?: Maybe<Scalars['Int']>;
  id: Scalars['Int'];
  language: Scalars['String'];
  messages?: Maybe<Array<Message>>;
  mnemonic?: Maybe<Scalars['String']>;
  mnemonicHash?: Maybe<Scalars['String']>;
  monthOfBirth?: Maybe<Scalars['Int']>;
  name: Scalars['String'];
  pageMessageSessions?: Maybe<Array<PageMessageSession>>;
  pages?: Maybe<Array<Page>>;
  publicKey?: Maybe<Scalars['String']>;
  secondaryLanguage?: Maybe<Scalars['String']>;
  secret?: Maybe<Scalars['String']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime'];
  website?: Maybe<Scalars['String']>;
  yearOfBirth?: Maybe<Scalars['Int']>;
};

export type AccountConnection = {
  __typename?: 'AccountConnection';
  edges?: Maybe<Array<AccountEdge>>;
  pageInfo: PageInfo;
  totalCount?: Maybe<Scalars['Int']>;
};

export type AccountDana = {
  __typename?: 'AccountDana';
  account: Account;
  accountDanaHistory?: Maybe<Array<AccountDanaHistory>>;
  accountId: Scalars['Int'];
  danaBurnDown: Scalars['Float'];
  danaBurnScore: Scalars['Float'];
  danaBurnUp: Scalars['Float'];
  danaGiven?: Maybe<Scalars['Float']>;
  danaReceived?: Maybe<Scalars['Float']>;
  danaReceivedDown: Scalars['Float'];
  danaReceivedScore: Scalars['Float'];
  danaReceivedUp: Scalars['Float'];
  id: Scalars['ID'];
  version: Scalars['Int'];
};

export type AccountDanaHistory = {
  __typename?: 'AccountDanaHistory';
  id: Scalars['ID'];
};

export type AccountEdge = {
  __typename?: 'AccountEdge';
  cursor: Scalars['String'];
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

export type Balances = {
  __typename?: 'Balances';
  totalBalance: Scalars['String'];
  totalBalanceInSatoshis: Scalars['String'];
};

export type BasicPageInfo = {
  __typename?: 'BasicPageInfo';
  endCursor: Scalars['String'];
  hasNextPage: Scalars['Boolean'];
};

export type Bookmark = {
  __typename?: 'Bookmark';
  account: Account;
  bookmarkableId: Scalars['String'];
  /** Identifies the date and time when the object was created. */
  createdAt?: Maybe<Scalars['DateTime']>;
  id: Scalars['ID'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']>;
};

export type BookmarkEdge = {
  __typename?: 'BookmarkEdge';
  cursor: Scalars['String'];
  node: Bookmark;
};

export type Category = {
  __typename?: 'Category';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime'];
  id: Scalars['ID'];
  name: Scalars['String'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime'];
};

export type City = {
  __typename?: 'City';
  country: Country;
  id: Scalars['ID'];
  name: Scalars['String'];
  state: State;
};

export type ClosePageMessageSessionInput = {
  pageMessageSessionId: Scalars['String'];
};

export type Comment = {
  __typename?: 'Comment';
  commentAccount: Account;
  commentAccountId?: Maybe<Scalars['Int']>;
  commentByPublicKey?: Maybe<Scalars['String']>;
  commentDana?: Maybe<CommentDana>;
  commentText: Scalars['String'];
  commentable?: Maybe<Commentable>;
  commentableId?: Maybe<Scalars['String']>;
  content: Scalars['String'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime'];
  danaBurnDown: Scalars['Float'];
  danaBurnScore: Scalars['Float'];
  danaBurnUp: Scalars['Float'];
  id: Scalars['ID'];
  imageUploadable?: Maybe<ImageUploadable>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime'];
};

export type CommentConnection = {
  __typename?: 'CommentConnection';
  edges?: Maybe<Array<CommentEdge>>;
  pageInfo: PageInfo;
  totalCount?: Maybe<Scalars['Int']>;
};

export type CommentDana = {
  __typename?: 'CommentDana';
  comment: Comment;
  commentId: Scalars['String'];
  danaBurnDown: Scalars['Float'];
  danaBurnScore: Scalars['Float'];
  danaBurnUp: Scalars['Float'];
  version: Scalars['Int'];
};

export type CommentEdge = {
  __typename?: 'CommentEdge';
  cursor: Scalars['String'];
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
  Poll = 'POLL',
  Post = 'POST',
  Product = 'PRODUCT'
}

export type Commentable = {
  __typename?: 'Commentable';
  commentToId: Scalars['String'];
  id: Scalars['ID'];
  type: CommentType;
};

export type Country = {
  __typename?: 'Country';
  capital: Scalars['String'];
  city: Array<City>;
  id: Scalars['ID'];
  name: Scalars['String'];
  state: Array<State>;
};

export type CreateAccountInput = {
  encryptedMnemonic: Scalars['String'];
  language: Scalars['String'];
  mnemonic: Scalars['String'];
  mnemonicHash: Scalars['String'];
};

export type CreateBookmarkInput = {
  accountId: Scalars['Int'];
  bookmarkableId: Scalars['String'];
};

export type CreateCommentInput = {
  commentByPublicKey?: InputMaybe<Scalars['String']>;
  commentText: Scalars['String'];
  commentableId: Scalars['String'];
  createFeeHex?: InputMaybe<Scalars['String']>;
  tipHex?: InputMaybe<Scalars['String']>;
  uploadId?: InputMaybe<Scalars['String']>;
};

export type CreateFollowAccountInput = {
  followerAccountId: Scalars['Int'];
  followingAccountId: Scalars['Int'];
};

export type CreateFollowPageInput = {
  accountId: Scalars['Int'];
  pageId: Scalars['String'];
};

export type CreateFollowTokenInput = {
  accountId: Scalars['Int'];
  tokenId: Scalars['String'];
};

export type CreateMessageInput = {
  authorId: Scalars['Int'];
  body?: InputMaybe<Scalars['String']>;
  isPageOwner?: InputMaybe<Scalars['Boolean']>;
  pageMessageSessionId?: InputMaybe<Scalars['String']>;
  tipHex?: InputMaybe<Scalars['String']>;
  uploadIds?: InputMaybe<Array<Scalars['String']>>;
};

export type CreatePageInput = {
  categoryId?: InputMaybe<Scalars['String']>;
  description: Scalars['String'];
  name: Scalars['String'];
};

export type CreatePageMessageInput = {
  accountId: Scalars['Int'];
  accountSecret?: InputMaybe<Scalars['String']>;
  lixiId?: InputMaybe<Scalars['Int']>;
  pageId: Scalars['String'];
};

export type CreatePollInput = {
  createFeeHex?: InputMaybe<Scalars['String']>;
  endDate: Scalars['DateTime'];
  htmlContent: Scalars['String'];
  options: Array<PollOptionInput>;
  pageId?: InputMaybe<Scalars['String']>;
  pureContent: Scalars['String'];
  startDate: Scalars['DateTime'];
};

export type CreatePostInput = {
  createFeeHex?: InputMaybe<Scalars['String']>;
  extraArguments?: InputMaybe<ExtraArguments>;
  htmlContent: Scalars['String'];
  pageAccountId?: InputMaybe<Scalars['Int']>;
  pageId?: InputMaybe<Scalars['String']>;
  pureContent: Scalars['String'];
  tokenPrimaryId?: InputMaybe<Scalars['String']>;
  uploads?: InputMaybe<Array<Scalars['String']>>;
};

export type CreateProductInput = {
  categoryId?: InputMaybe<Scalars['Int']>;
  description?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  pageId?: InputMaybe<Scalars['String']>;
  phoneNumber?: InputMaybe<Scalars['String']>;
  price: Scalars['Int'];
  priceUnit: Scalars['String'];
  title?: InputMaybe<Scalars['String']>;
  uploadImages?: InputMaybe<Array<Scalars['String']>>;
};

export type CreateTempleInput = {
  achievement?: InputMaybe<Scalars['String']>;
  address?: InputMaybe<Scalars['String']>;
  alias?: InputMaybe<Scalars['String']>;
  avatar?: InputMaybe<Scalars['String']>;
  cityId?: InputMaybe<Scalars['String']>;
  countryId?: InputMaybe<Scalars['String']>;
  cover?: InputMaybe<Scalars['String']>;
  dateOfCompleted?: InputMaybe<Scalars['DateTime']>;
  description?: InputMaybe<Scalars['String']>;
  name: Scalars['String'];
  president?: InputMaybe<Scalars['String']>;
  religion?: InputMaybe<Scalars['String']>;
  stateId?: InputMaybe<Scalars['String']>;
  website?: InputMaybe<Scalars['String']>;
};

export type CreateTokenInput = {
  tokenId: Scalars['String'];
};

export type CreateWorshipInput = {
  latitude?: InputMaybe<Scalars['Decimal']>;
  location?: InputMaybe<Scalars['String']>;
  longitude?: InputMaybe<Scalars['Decimal']>;
  templeId?: InputMaybe<Scalars['String']>;
  worshipedAmount: Scalars['Float'];
  worshipedPersonId?: InputMaybe<Scalars['String']>;
};

export type CreateWorshipedPersonInput = {
  avatar?: InputMaybe<Scalars['String']>;
  bio?: InputMaybe<Scalars['String']>;
  cityId?: InputMaybe<Scalars['String']>;
  countryId?: InputMaybe<Scalars['String']>;
  dateOfBirth?: InputMaybe<Scalars['String']>;
  dateOfDeath?: InputMaybe<Scalars['String']>;
  name: Scalars['String'];
  quote?: InputMaybe<Scalars['String']>;
  stateId?: InputMaybe<Scalars['String']>;
  wikiDataId?: InputMaybe<Scalars['String']>;
};

export type DeleteFollowAccountInput = {
  followerAccountId: Scalars['Int'];
  followingAccountId: Scalars['Int'];
};

export type DeleteFollowPageInput = {
  accountId: Scalars['Int'];
  pageId: Scalars['String'];
};

export type DeleteFollowTokenInput = {
  accountId: Scalars['Int'];
  tokenId: Scalars['String'];
};

export type DeleteProductInput = {
  id: Scalars['ID'];
  uploadImages?: InputMaybe<Array<Scalars['String']>>;
};

export type DistributionModel = {
  __typename?: 'DistributionModel';
  address: Scalars['String'];
  distributionType: Scalars['String'];
  id: Scalars['ID'];
  lixiId: Scalars['Int'];
};

export type EnvelopeModel = {
  __typename?: 'EnvelopeModel';
  /** Identifies the date and time when the object was created. */
  createdAt?: Maybe<Scalars['DateTime']>;
  description: Scalars['String'];
  id: Scalars['ID'];
  image: Scalars['String'];
  name: Scalars['String'];
  slug: Scalars['String'];
  thumbnail: Scalars['String'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']>;
};

export type Event = {
  __typename?: 'Event';
  account: Account;
  accountId: Scalars['Int'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime'];
  dana: EventDana;
  danaViewScore?: Maybe<Scalars['Float']>;
  description: Scalars['String'];
  endDate: Scalars['DateTime'];
  eventType: EventType;
  followOwner: Scalars['Boolean'];
  followedPage: Scalars['Boolean'];
  followedToken: Scalars['Boolean'];
  id: Scalars['ID'];
  imageUploadable?: Maybe<ImageUploadable>;
  location?: Maybe<Scalars['String']>;
  name: Scalars['String'];
  page?: Maybe<Page>;
  pageId?: Maybe<Scalars['String']>;
  startDate: Scalars['DateTime'];
  totalComments?: Maybe<Scalars['Int']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime'];
};

export type EventDana = {
  __typename?: 'EventDana';
  danaBurnDown: Scalars['Float'];
  danaBurnScore: Scalars['Float'];
  danaBurnUp: Scalars['Float'];
  danaReceivedDown: Scalars['Float'];
  danaReceivedScore: Scalars['Float'];
  danaReceivedUp: Scalars['Float'];
  event: Event;
  eventId: Scalars['String'];
  version: Scalars['Int'];
};

/** The type of event. */
export enum EventType {
  Physical = 'PHYSICAL',
  Virtual = 'VIRTUAL'
}

export type ExtraArguments = {
  hashtagId?: InputMaybe<Scalars['String']>;
  hashtags?: InputMaybe<Array<Scalars['String']>>;
  isTop?: InputMaybe<Scalars['String']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<PostOrder>;
  query?: InputMaybe<Scalars['String']>;
};

export type FollowAccount = {
  __typename?: 'FollowAccount';
  avatar: Scalars['String'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime'];
  followerAccount?: Maybe<Account>;
  followerAccountId?: Maybe<Scalars['Int']>;
  followingAccount?: Maybe<Account>;
  followingAccountId?: Maybe<Scalars['Int']>;
  id?: Maybe<Scalars['ID']>;
  isFollowed?: Maybe<Scalars['Boolean']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime'];
};

export type FollowAccountEdge = {
  __typename?: 'FollowAccountEdge';
  cursor: Scalars['String'];
  node: FollowAccount;
};

export type FollowPage = {
  __typename?: 'FollowPage';
  account?: Maybe<Account>;
  accountId?: Maybe<Scalars['Int']>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime'];
  id?: Maybe<Scalars['ID']>;
  isFollowed?: Maybe<Scalars['Boolean']>;
  page?: Maybe<Page>;
  pageId?: Maybe<Scalars['String']>;
  token?: Maybe<Token>;
  tokenId?: Maybe<Scalars['String']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime'];
};

export type FollowPageEdge = {
  __typename?: 'FollowPageEdge';
  cursor: Scalars['String'];
  node: FollowPage;
};

export type Hashtag = {
  __typename?: 'Hashtag';
  content: Scalars['String'];
  /** Identifies the date and time when the object was created. */
  createdAt?: Maybe<Scalars['DateTime']>;
  danaBurnDown: Scalars['Float'];
  danaBurnScore: Scalars['Float'];
  danaBurnUp: Scalars['Float'];
  hashtagDana?: Maybe<HashtagDana>;
  id: Scalars['ID'];
  normalizedContent: Scalars['String'];
  postHashtags?: Maybe<Array<PostHashtag>>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']>;
};

export type HashtagConnection = {
  __typename?: 'HashtagConnection';
  edges?: Maybe<Array<HashtagEdge>>;
  pageInfo: PageInfo;
  totalCount?: Maybe<Scalars['Int']>;
};

export type HashtagDana = {
  __typename?: 'HashtagDana';
  danaBurnDown: Scalars['Float'];
  danaBurnScore: Scalars['Float'];
  danaBurnUp: Scalars['Float'];
  danaReceivedDown: Scalars['Float'];
  danaReceivedScore: Scalars['Float'];
  danaReceivedUp: Scalars['Float'];
  hashtag?: Maybe<Hashtag>;
  hashtagId?: Maybe<Scalars['String']>;
  version: Scalars['Int'];
};

export type HashtagEdge = {
  __typename?: 'HashtagEdge';
  cursor: Scalars['String'];
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
  id: Scalars['ID'];
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

export type ImportAccountInput = {
  language?: InputMaybe<Scalars['String']>;
  mnemonic: Scalars['String'];
  mnemonicHash?: InputMaybe<Scalars['String']>;
};

export type LatestMessage = {
  __typename?: 'LatestMessage';
  author?: Maybe<LatestMessageAuthor>;
  body?: Maybe<Scalars['String']>;
  id?: Maybe<Scalars['ID']>;
};

export type LatestMessageAuthor = {
  __typename?: 'LatestMessageAuthor';
  address?: Maybe<Scalars['String']>;
  id?: Maybe<Scalars['Int']>;
};

export type LixiModel = {
  __typename?: 'LixiModel';
  accountId: Scalars['Int'];
  /** Identifies the date and time when the object was activated. */
  activationAt?: Maybe<Scalars['DateTime']>;
  address: Scalars['String'];
  amount: Scalars['String'];
  balance?: Maybe<Scalars['Int']>;
  claimCode?: Maybe<Scalars['String']>;
  claimType: Scalars['Int'];
  claimedNum: Scalars['Int'];
  country?: Maybe<Scalars['String']>;
  /** Identifies the date and time when the object was created. */
  createdAt?: Maybe<Scalars['DateTime']>;
  distributions?: Maybe<Array<DistributionModel>>;
  dividedValue: Scalars['Int'];
  encryptedClaimCode: Scalars['String'];
  envelope?: Maybe<EnvelopeModel>;
  envelopeId?: Maybe<Scalars['Int']>;
  envelopeMessage?: Maybe<Scalars['String']>;
  /** Identifies the date and time when the object was expired. */
  expiryAt?: Maybe<Scalars['DateTime']>;
  fixedValue: Scalars['Int'];
  id: Scalars['ID'];
  inventoryStatus: Scalars['String'];
  isClaimed?: Maybe<Scalars['Boolean']>;
  isFamilyFriendly: Scalars['Boolean'];
  isNFTEnabled: Scalars['Boolean'];
  joinLotteryProgram: Scalars['Boolean'];
  lixiType: Scalars['Int'];
  maxClaim: Scalars['Int'];
  maxValue: Scalars['Int'];
  minStaking: Scalars['Int'];
  minValue: Scalars['Int'];
  name: Scalars['String'];
  networkType?: Maybe<Scalars['String']>;
  numberLixiPerPackage?: Maybe<Scalars['Int']>;
  numberOfSubLixi?: Maybe<Scalars['Int']>;
  packageId?: Maybe<Scalars['Int']>;
  pageMessageSession?: Maybe<PageMessageSession>;
  parentId?: Maybe<Scalars['Int']>;
  status: Scalars['String'];
  subLixiBalance?: Maybe<Scalars['Int']>;
  subLixiTotalClaim?: Maybe<Scalars['Int']>;
  totalClaim: Scalars['Int'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']>;
};

export type Message = {
  __typename?: 'Message';
  author: Account;
  body?: Maybe<Scalars['String']>;
  /** Identifies the date and time when the object was created. */
  createdAt?: Maybe<Scalars['DateTime']>;
  id: Scalars['ID'];
  imageUploadable?: Maybe<ImageUploadable>;
  isPageOwner?: Maybe<Scalars['Boolean']>;
  pageMessageSession?: Maybe<PageMessageSession>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']>;
};

export type MessageConnection = {
  __typename?: 'MessageConnection';
  edges?: Maybe<Array<MessageEdge>>;
  pageInfo: PageInfo;
  totalCount?: Maybe<Scalars['Int']>;
};

export type MessageEdge = {
  __typename?: 'MessageEdge';
  cursor: Scalars['String'];
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
  createdAt?: Maybe<Scalars['DateTime']>;
  id: Scalars['ID'];
  lixi?: Maybe<LixiModel>;
  lixiAmount?: Maybe<Scalars['Int']>;
  messages: Array<Message>;
  pageMessageSession?: Maybe<PageMessageSession>;
  sessionOpen?: Maybe<Scalars['Boolean']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']>;
};

export type MessageSessionEdge = {
  __typename?: 'MessageSessionEdge';
  cursor: Scalars['String'];
  node: MessageSession;
};

export type Mutation = {
  __typename?: 'Mutation';
  closePageMessageSession: PageMessageSession;
  create: Poll;
  createAccount: Account;
  createBookmark: Bookmark;
  createComment: Comment;
  createFollowAccount: FollowAccount;
  createFollowPage: FollowPage;
  createFollowToken: FollowPage;
  createMessage: Message;
  createPage: Page;
  createPageMessageSession: PageMessageSession;
  createPost: Post;
  createProduct: Product;
  createTemple: Temple;
  createToken: Token;
  createWorship: Worship;
  createWorshipTemple: Worship;
  createWorshipedPerson: WorshipedPerson;
  deleteFollowAccount: Scalars['Boolean'];
  deleteFollowPage: Scalars['Boolean'];
  deleteFollowToken: Scalars['Boolean'];
  deleteProduct: Product;
  importAccount: Account;
  openPageMessageSession: PageMessageSession;
  removeBookmark: Bookmark;
  repost: Scalars['Boolean'];
  updateAccount: Account;
  updatePage: Page;
  updatePost: Post;
};


export type MutationClosePageMessageSessionArgs = {
  data: ClosePageMessageSessionInput;
};


export type MutationCreateArgs = {
  data: CreatePollInput;
};


export type MutationCreateAccountArgs = {
  data: CreateAccountInput;
};


export type MutationCreateBookmarkArgs = {
  data: CreateBookmarkInput;
};


export type MutationCreateCommentArgs = {
  data: CreateCommentInput;
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


export type MutationCreatePageArgs = {
  data: CreatePageInput;
};


export type MutationCreatePageMessageSessionArgs = {
  data: CreatePageMessageInput;
};


export type MutationCreatePostArgs = {
  data: CreatePostInput;
};


export type MutationCreateProductArgs = {
  data: CreateProductInput;
};


export type MutationCreateTempleArgs = {
  data: CreateTempleInput;
};


export type MutationCreateTokenArgs = {
  data: CreateTokenInput;
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


export type MutationDeleteProductArgs = {
  data: DeleteProductInput;
};


export type MutationImportAccountArgs = {
  data: ImportAccountInput;
};


export type MutationOpenPageMessageSessionArgs = {
  data: OpenPageMessageSessionInput;
};


export type MutationRemoveBookmarkArgs = {
  data: RemoveBookmarkInput;
};


export type MutationRepostArgs = {
  data: RepostInput;
};


export type MutationUpdateAccountArgs = {
  data: UpdateAccountInput;
};


export type MutationUpdatePageArgs = {
  data: UpdatePageInput;
};


export type MutationUpdatePostArgs = {
  data: UpdatePostInput;
};

export type OpenPageMessageSessionInput = {
  pageMessageSessionId: Scalars['String'];
};

/** Possible directions in which to order a list of items when provided an `orderBy` argument. */
export enum OrderDirection {
  Asc = 'asc',
  Desc = 'desc'
}

export type Page = {
  __typename?: 'Page';
  accessMessageFee?: Maybe<Scalars['Float']>;
  address?: Maybe<Scalars['String']>;
  avatar?: Maybe<Scalars['String']>;
  avatarImageUplodableId?: Maybe<Scalars['String']>;
  category?: Maybe<Category>;
  categoryId?: Maybe<Scalars['Int']>;
  countryId?: Maybe<Scalars['Int']>;
  countryName?: Maybe<Scalars['String']>;
  cover?: Maybe<Scalars['String']>;
  coverImageUplodableId?: Maybe<Scalars['String']>;
  createCommentFee: Scalars['String'];
  createPostFee: Scalars['String'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime'];
  danaBurnDown: Scalars['Float'];
  danaBurnScore: Scalars['Float'];
  danaBurnUp: Scalars['Float'];
  description: Scalars['String'];
  encryptedMnemonic?: Maybe<Scalars['String']>;
  followerFreeMessage?: Maybe<Scalars['Boolean']>;
  followersCount?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
  minDanaForMessage?: Maybe<Scalars['Float']>;
  name: Scalars['String'];
  pageAccount: Account;
  pageAccountId: Scalars['Int'];
  pageDana?: Maybe<PageDana>;
  pageMessageSessions?: Maybe<Array<PageMessageSession>>;
  parent?: Maybe<Page>;
  parentId?: Maybe<Scalars['String']>;
  salt?: Maybe<Scalars['String']>;
  stateId?: Maybe<Scalars['Int']>;
  stateName?: Maybe<Scalars['String']>;
  title?: Maybe<Scalars['String']>;
  /** The sum of burn amount for every post on page */
  totalBurnForPage?: Maybe<Scalars['Float']>;
  totalPostsBurnDown: Scalars['Float'];
  totalPostsBurnScore: Scalars['Float'];
  totalPostsBurnUp: Scalars['Float'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime'];
  website?: Maybe<Scalars['String']>;
};

export type PageBasicConnection = {
  __typename?: 'PageBasicConnection';
  edges: Array<PageBasicEdge>;
  pageInfo: BasicPageInfo;
  totalCount: Scalars['Int'];
};

export type PageBasicEdge = {
  __typename?: 'PageBasicEdge';
  cursor: Scalars['String'];
  node: Page;
};

export type PageDana = {
  __typename?: 'PageDana';
  danaBurnDown: Scalars['Float'];
  danaBurnScore: Scalars['Float'];
  danaBurnUp: Scalars['Float'];
  danaReceivedDown: Scalars['Float'];
  danaReceivedScore: Scalars['Float'];
  danaReceivedUp: Scalars['Float'];
  page: Page;
  pageId: Scalars['String'];
  version: Scalars['Int'];
};

export type PageEdge = {
  __typename?: 'PageEdge';
  cursor: Scalars['String'];
  node: Page;
};

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['String']>;
  hasNextPage: Scalars['Boolean'];
  hasPreviousPage: Scalars['Boolean'];
  startCursor?: Maybe<Scalars['String']>;
};

export type PageMessageSession = {
  __typename?: 'PageMessageSession';
  account: Account;
  /** Identifies the date and time when the object was created. */
  createdAt?: Maybe<Scalars['DateTime']>;
  id: Scalars['ID'];
  latestMessage?: Maybe<LatestMessage>;
  lixi?: Maybe<LixiModel>;
  lixiClaimCode?: Maybe<Scalars['String']>;
  messages?: Maybe<Array<Message>>;
  page: Page;
  /** Identifies the date and time when the session was closed. */
  sessionClosedAt?: Maybe<Scalars['DateTime']>;
  /** Identifies the date and time when the session was opened. */
  sessionOpenedAt?: Maybe<Scalars['DateTime']>;
  status: PageMessageSessionStatus;
  /** Identifies the date and time when the object was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']>;
};

export type PageMessageSessionConnection = {
  __typename?: 'PageMessageSessionConnection';
  edges?: Maybe<Array<PageMessageSessionEdge>>;
  pageInfo: PageInfo;
  totalCount?: Maybe<Scalars['Int']>;
};

export type PageMessageSessionEdge = {
  __typename?: 'PageMessageSessionEdge';
  cursor: Scalars['String'];
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

export type Poll = {
  __typename?: 'Poll';
  account: Account;
  accountId: Scalars['Int'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime'];
  dana: PollDana;
  danaViewScore?: Maybe<Scalars['Float']>;
  endDate: Scalars['DateTime'];
  followOwner: Scalars['Boolean'];
  followedPage: Scalars['Boolean'];
  followedToken: Scalars['Boolean'];
  id: Scalars['ID'];
  options: Array<PollOption>;
  page?: Maybe<Page>;
  pageId?: Maybe<Scalars['String']>;
  question: Scalars['String'];
  startDate: Scalars['DateTime'];
  totalComments?: Maybe<Scalars['Int']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime'];
};

export type PollDana = {
  __typename?: 'PollDana';
  danaBurnDown: Scalars['Float'];
  danaBurnScore: Scalars['Float'];
  danaBurnUp: Scalars['Float'];
  danaReceivedDown: Scalars['Float'];
  danaReceivedScore: Scalars['Float'];
  danaReceivedUp: Scalars['Float'];
  poll: Poll;
  pollId: Scalars['String'];
  version: Scalars['Int'];
};

export type PollOption = {
  __typename?: 'PollOption';
  danaPoint: Scalars['Float'];
  id: Scalars['ID'];
  option: Scalars['String'];
  pollId: Scalars['Int'];
};

export type PollOptionInput = {
  option: Scalars['String'];
  pollId: Scalars['Int'];
};

export type Post = {
  __typename?: 'Post';
  bookmarkableId?: Maybe<Scalars['String']>;
  commentableId?: Maybe<Scalars['String']>;
  content: Scalars['String'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime'];
  danaBurnDown: Scalars['Float'];
  danaBurnScore: Scalars['Float'];
  danaBurnUp: Scalars['Float'];
  danaViewScore?: Maybe<Scalars['Float']>;
  followPostOwner?: Maybe<Scalars['Boolean']>;
  followedPage?: Maybe<Scalars['Boolean']>;
  followedToken?: Maybe<Scalars['Boolean']>;
  id: Scalars['ID'];
  imageUploadable?: Maybe<ImageUploadable>;
  originalLanguage?: Maybe<Scalars['String']>;
  page?: Maybe<Page>;
  pageId?: Maybe<Scalars['String']>;
  postAccount: Account;
  postAccountId: Scalars['Int'];
  postDana?: Maybe<PostDana>;
  postHashtags?: Maybe<Array<PostHashtag>>;
  repostCount: Scalars['Int'];
  reposts?: Maybe<Array<Repost>>;
  taggableId?: Maybe<Scalars['String']>;
  token?: Maybe<Token>;
  tokenId?: Maybe<Scalars['String']>;
  totalComments: Scalars['Int'];
  translations?: Maybe<Array<PostTranslation>>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime'];
};

export type PostConnection = {
  __typename?: 'PostConnection';
  edges?: Maybe<Array<PostEdge>>;
  pageInfo: PageInfo;
  totalCount?: Maybe<Scalars['Int']>;
};

export type PostDana = {
  __typename?: 'PostDana';
  danaBurnDown: Scalars['Float'];
  danaBurnScore: Scalars['Float'];
  danaBurnUp: Scalars['Float'];
  danaReceivedDown: Scalars['Float'];
  danaReceivedScore: Scalars['Float'];
  danaReceivedUp: Scalars['Float'];
  post: Post;
  postId: Scalars['String'];
  version: Scalars['Int'];
};

export type PostEdge = {
  __typename?: 'PostEdge';
  cursor: Scalars['String'];
  node: Post;
};

export type PostHashtag = {
  __typename?: 'PostHashtag';
  /** Identifies the date and time when the object was created. */
  createdAt?: Maybe<Scalars['DateTime']>;
  hashtag: Hashtag;
  hashtagId: Scalars['String'];
  id: Scalars['ID'];
  post?: Maybe<Post>;
  postId?: Maybe<Scalars['String']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']>;
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
  createdAt: Scalars['DateTime'];
  id: Scalars['ID'];
  translateContent?: Maybe<Scalars['String']>;
  translateLanguage?: Maybe<Scalars['String']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime'];
};

export type Product = {
  __typename?: 'Product';
  address?: Maybe<Scalars['String']>;
  categoryId?: Maybe<Scalars['String']>;
  country?: Maybe<Country>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime'];
  description: Scalars['String'];
  id: Scalars['ID'];
  imageUploadableId: Scalars['String'];
  name: Scalars['String'];
  page: Page;
  phoneNumber: Scalars['String'];
  price: Scalars['Int'];
  priceUnit: Scalars['String'];
  state?: Maybe<State>;
  title: Scalars['String'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime'];
};

export type ProductConnection = {
  __typename?: 'ProductConnection';
  edges?: Maybe<Array<ProductEdge>>;
  pageInfo: PageInfo;
  totalCount?: Maybe<Scalars['Int']>;
};

export type ProductEdge = {
  __typename?: 'ProductEdge';
  cursor: Scalars['String'];
  node: Product;
};

export type ProductOrder = {
  direction: OrderDirection;
  field: ProductOrderField;
};

/** Properties by which page connections can be ordered. */
export enum ProductOrderField {
  CreatedAt = 'createdAt',
  Id = 'id',
  LotusBurnScore = 'lotusBurnScore',
  Name = 'name',
  Title = 'title',
  UpdatedAt = 'updatedAt'
}

export type Query = {
  __typename?: 'Query';
  account: Account;
  allClosedPageMessageSession: PageMessageSessionConnection;
  allFollowersByFollowing: AccountConnection;
  allFollowingsByFollower: AccountConnection;
  allHashtag: HashtagConnection;
  allHashtagByPage: HashtagConnection;
  allHashtagBySearch: HashtagConnection;
  allHashtagByToken: HashtagConnection;
  allMessageByPageMessageSessionId: MessageConnection;
  allOpenPageMessageSessionByAccountId: PageMessageSessionConnection;
  allOpenPageMessageSessionByPageId: PageMessageSessionConnection;
  allPageMessageSessionByAccountId: PageMessageSessionConnection;
  allPages: PageBasicConnection;
  allPagesByUserId: PageBasicConnection;
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
  allProducts: ProductConnection;
  allProductsByPageId: ProductConnection;
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
  bookmark: Bookmark;
  checkIfFollowAccount: Scalars['Boolean'];
  checkIfFollowPage: Scalars['Boolean'];
  checkIfFollowToken: Scalars['Boolean'];
  comment: Comment;
  commentsToCommentableId: CommentConnection;
  getAccountByAddress: Account;
  getBalances: Balances;
  hashtag: Hashtag;
  homeTimeline: TimelineItemConnection;
  message: Message;
  page: Page;
  pageMessageSession: PageMessageSession;
  pagesByFollower: PageBasicConnection;
  poll: Poll;
  post: Post;
  product: Product;
  temple: Temple;
  timeline: TimelineItem;
  token: Token;
  tokenByTokenId: Token;
  userHadMessageToPage?: Maybe<PageMessageSession>;
  worship: Worship;
  worshipedPerson: WorshipedPerson;
};


export type QueryAccountArgs = {
  id: Scalars['Int'];
};


export type QueryAllClosedPageMessageSessionArgs = {
  accountId?: InputMaybe<Scalars['Int']>;
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<PageMessageSessionOrder>;
  pageId?: InputMaybe<Scalars['String']>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllFollowersByFollowingArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  followingAccountId?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<AccountOrder>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllFollowingsByFollowerArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  followerAccountId?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<AccountOrder>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllHashtagArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<HashtagOrder>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllHashtagByPageArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['String']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<HashtagOrder>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllHashtagBySearchArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  query?: InputMaybe<Scalars['String']>;
};


export type QueryAllHashtagByTokenArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['String']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<HashtagOrder>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllMessageByPageMessageSessionIdArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['String']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<MessageOrder>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllOpenPageMessageSessionByAccountIdArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<PageMessageSessionOrder>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllOpenPageMessageSessionByPageIdArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['String']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<PageMessageSessionOrder>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllPageMessageSessionByAccountIdArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<PageMessageSessionOrder>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllPagesArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllPagesByUserIdArgs = {
  after?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['Int']>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllPendingPageMessageSessionByAccountIdArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<PageMessageSessionOrder>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllPendingPageMessageSessionByPageIdArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['String']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<PageMessageSessionOrder>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllPostsByHashtagIdArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['String']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<PostOrder>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllPostsByPageIdArgs = {
  accountId?: InputMaybe<Scalars['Int']>;
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['String']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Array<PostOrder>>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllPostsBySearchArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  query?: InputMaybe<Scalars['String']>;
};


export type QueryAllPostsBySearchWithHashtagArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  hashtags?: InputMaybe<Array<Scalars['String']>>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<PostOrder>;
  query?: InputMaybe<Scalars['String']>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllPostsBySearchWithHashtagAtPageArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  hashtags?: InputMaybe<Array<Scalars['String']>>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<PostOrder>;
  pageId?: InputMaybe<Scalars['String']>;
  query?: InputMaybe<Scalars['String']>;
};


export type QueryAllPostsBySearchWithHashtagAtTokenArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  hashtags?: InputMaybe<Array<Scalars['String']>>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<PostOrder>;
  query?: InputMaybe<Scalars['String']>;
  tokenId?: InputMaybe<Scalars['String']>;
};


export type QueryAllPostsByTokenIdArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['String']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<PostOrder>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllPostsByUserIdArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Array<PostOrder>>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllProductsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<ProductOrder>;
  query?: InputMaybe<Scalars['String']>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllProductsByPageIdArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['String']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<ProductOrder>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllTempleArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<TempleOrder>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllTempleBySearchArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  query?: InputMaybe<Scalars['String']>;
};


export type QueryAllTokensArgs = {
  after?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllWorshipArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<WorshipOrder>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllWorshipedByPersonIdArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['String']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<WorshipOrder>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllWorshipedByTempleIdArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['String']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<WorshipOrder>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllWorshipedPersonArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<WorshipedPersonOrder>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllWorshipedPersonBySearchArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  query?: InputMaybe<Scalars['String']>;
};


export type QueryAllWorshipedPersonByUserIdArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<WorshipedPersonOrder>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryAllWorshipedPersonSpecialDateArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<WorshipedPersonOrder>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryBookmarkArgs = {
  id: Scalars['String'];
};


export type QueryCheckIfFollowAccountArgs = {
  followingAccountId: Scalars['Int'];
};


export type QueryCheckIfFollowPageArgs = {
  pageId?: InputMaybe<Scalars['String']>;
};


export type QueryCheckIfFollowTokenArgs = {
  tokenId?: InputMaybe<Scalars['String']>;
};


export type QueryCommentArgs = {
  id: Scalars['String'];
};


export type QueryCommentsToCommentableIdArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['String']>;
  last?: InputMaybe<Scalars['Int']>;
  minBurnFilter?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<CommentOrder>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryGetAccountByAddressArgs = {
  address: Scalars['String'];
};


export type QueryGetBalancesArgs = {
  address: Scalars['String'];
};


export type QueryHashtagArgs = {
  content: Scalars['String'];
};


export type QueryHomeTimelineArgs = {
  after?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  level?: InputMaybe<Scalars['Int']>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryMessageArgs = {
  id: Scalars['String'];
};


export type QueryPageArgs = {
  id: Scalars['String'];
};


export type QueryPageMessageSessionArgs = {
  id: Scalars['String'];
};


export type QueryPagesByFollowerArgs = {
  after?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  skip?: InputMaybe<Scalars['Int']>;
};


export type QueryPollArgs = {
  id: Scalars['String'];
};


export type QueryPostArgs = {
  id: Scalars['String'];
};


export type QueryProductArgs = {
  id: Scalars['String'];
};


export type QueryTempleArgs = {
  id: Scalars['String'];
};


export type QueryTimelineArgs = {
  id: Scalars['String'];
};


export type QueryTokenArgs = {
  id: Scalars['String'];
};


export type QueryTokenByTokenIdArgs = {
  tokenId: Scalars['String'];
};


export type QueryUserHadMessageToPageArgs = {
  accountId?: InputMaybe<Scalars['Int']>;
  pageId?: InputMaybe<Scalars['String']>;
};


export type QueryWorshipArgs = {
  id: Scalars['String'];
};


export type QueryWorshipedPersonArgs = {
  id: Scalars['String'];
};

export type RemoveBookmarkInput = {
  accountId: Scalars['Int'];
  bookmarkId: Scalars['String'];
};

export type Repost = {
  __typename?: 'Repost';
  account?: Maybe<Account>;
  accountId?: Maybe<Scalars['Int']>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime'];
  id?: Maybe<Scalars['ID']>;
  post?: Maybe<Post>;
  postId?: Maybe<Scalars['String']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime'];
};

export type RepostInput = {
  accountId: Scalars['Int'];
  postId: Scalars['String'];
  txHex?: InputMaybe<Scalars['String']>;
};

export type State = {
  __typename?: 'State';
  city: Array<City>;
  country: City;
  id: Scalars['ID'];
  name: Scalars['String'];
};

export type Subscription = {
  __typename?: 'Subscription';
  bookmarkCreated: Bookmark;
  followAccountCreated: FollowAccount;
  hashtagCreated: Hashtag;
  messageCreated: Message;
  pageMessageSessionCreated: PageMessageSession;
  templeCreated: Temple;
  worshipedPersonCreated: WorshipedPerson;
};

export type Temple = {
  __typename?: 'Temple';
  account: Account;
  achievement?: Maybe<Scalars['String']>;
  address?: Maybe<Scalars['String']>;
  alias?: Maybe<Scalars['String']>;
  avatar?: Maybe<UploadDetail>;
  city?: Maybe<City>;
  country?: Maybe<Country>;
  cover?: Maybe<UploadDetail>;
  /** Identifies the date and time when the object was created. */
  createdAt?: Maybe<Scalars['DateTime']>;
  dateOfCompleted?: Maybe<Scalars['DateTime']>;
  description?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  name: Scalars['String'];
  president?: Maybe<Scalars['String']>;
  religion?: Maybe<Scalars['String']>;
  state?: Maybe<State>;
  totalWorshipAmount?: Maybe<Scalars['Int']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']>;
  verified: Scalars['Boolean'];
  website?: Maybe<Scalars['String']>;
};

export type TempleConnection = {
  __typename?: 'TempleConnection';
  edges?: Maybe<Array<TempleEdge>>;
  pageInfo: PageInfo;
  totalCount?: Maybe<Scalars['Int']>;
};

export type TempleEdge = {
  __typename?: 'TempleEdge';
  cursor: Scalars['String'];
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
  id: Scalars['ID'];
};

export type TimelineItemBasicEdge = {
  __typename?: 'TimelineItemBasicEdge';
  cursor: Scalars['String'];
  node: TimelineItem;
};

export type TimelineItemConnection = {
  __typename?: 'TimelineItemConnection';
  edges: Array<TimelineItemBasicEdge>;
  pageInfo: BasicPageInfo;
  totalCount: Scalars['Int'];
};

export type TimelineItemData = Post;

export type Token = {
  __typename?: 'Token';
  /** Identifies the date and time when the object was last comments. */
  comments?: Maybe<Scalars['DateTime']>;
  /** Identifies the date and time when the object was created. */
  createdDate: Scalars['DateTime'];
  dana?: Maybe<TokenDana>;
  decimals: Scalars['Int'];
  followersCount?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
  initialTokenQuantity?: Maybe<Scalars['String']>;
  isFollowed?: Maybe<Scalars['Boolean']>;
  name: Scalars['String'];
  rank?: Maybe<Scalars['Int']>;
  ticker: Scalars['String'];
  tokenDocumentUrl?: Maybe<Scalars['String']>;
  tokenId: Scalars['String'];
  tokenType: Scalars['String'];
  totalMinted?: Maybe<Scalars['String']>;
};

export type TokenBasicEdge = {
  __typename?: 'TokenBasicEdge';
  cursor: Scalars['String'];
  node: Token;
};

export type TokenConnection = {
  __typename?: 'TokenConnection';
  edges: Array<TokenBasicEdge>;
  pageInfo: BasicPageInfo;
  totalCount: Scalars['Int'];
};

export type TokenDana = {
  __typename?: 'TokenDana';
  danaBurnDown: Scalars['Float'];
  danaBurnScore: Scalars['Float'];
  danaBurnUp: Scalars['Float'];
  danaReceivedDown: Scalars['Float'];
  danaReceivedScore: Scalars['Float'];
  danaReceivedUp: Scalars['Float'];
  token: Token;
  tokenId: Scalars['String'];
  version: Scalars['Int'];
};

export type UpdateAccountInput = {
  avatar?: InputMaybe<Scalars['String']>;
  birthday?: InputMaybe<Scalars['DateTime']>;
  cover?: InputMaybe<Scalars['String']>;
  createCommentFee?: InputMaybe<Scalars['String']>;
  description?: InputMaybe<Scalars['String']>;
  id: Scalars['Int'];
  language?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  website?: InputMaybe<Scalars['String']>;
};

export type UpdatePageInput = {
  address?: InputMaybe<Scalars['String']>;
  avatar?: InputMaybe<Scalars['String']>;
  categoryId?: InputMaybe<Scalars['String']>;
  countryId?: InputMaybe<Scalars['String']>;
  cover?: InputMaybe<Scalars['String']>;
  createCommentFee?: InputMaybe<Scalars['String']>;
  createPostFee?: InputMaybe<Scalars['String']>;
  description?: InputMaybe<Scalars['String']>;
  id: Scalars['ID'];
  name?: InputMaybe<Scalars['String']>;
  parentId?: InputMaybe<Scalars['String']>;
  stateId?: InputMaybe<Scalars['String']>;
  title?: InputMaybe<Scalars['String']>;
  website?: InputMaybe<Scalars['String']>;
};

export type UpdatePostInput = {
  extraArguments?: InputMaybe<ExtraArguments>;
  htmlContent: Scalars['String'];
  id: Scalars['ID'];
  pureContent: Scalars['String'];
};

export type Upload = {
  __typename?: 'Upload';
  bucket?: Maybe<Scalars['String']>;
  cfImageFilename?: Maybe<Scalars['String']>;
  cfImageId?: Maybe<Scalars['String']>;
  extension?: Maybe<Scalars['String']>;
  height?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
  sha: Scalars['String'];
  thumbnailHeight?: Maybe<Scalars['Int']>;
  thumbnailWidth?: Maybe<Scalars['Int']>;
  type?: Maybe<Scalars['String']>;
  width?: Maybe<Scalars['Int']>;
};

export type UploadDetail = {
  __typename?: 'UploadDetail';
  account?: Maybe<Account>;
  accountId?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
  postId?: Maybe<Scalars['String']>;
  upload: Upload;
};

export type Worship = {
  __typename?: 'Worship';
  account: Account;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime'];
  id: Scalars['ID'];
  latitude?: Maybe<Scalars['Decimal']>;
  location?: Maybe<Scalars['String']>;
  longitude?: Maybe<Scalars['Decimal']>;
  temple?: Maybe<Temple>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime'];
  worshipedAmount: Scalars['Float'];
  worshipedPerson?: Maybe<WorshipedPerson>;
};

export type WorshipConnection = {
  __typename?: 'WorshipConnection';
  edges?: Maybe<Array<WorshipEdge>>;
  pageInfo: PageInfo;
  totalCount?: Maybe<Scalars['Int']>;
};

export type WorshipEdge = {
  __typename?: 'WorshipEdge';
  cursor: Scalars['String'];
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
  achievement?: Maybe<Scalars['String']>;
  alias?: Maybe<Scalars['String']>;
  avatar?: Maybe<UploadDetail>;
  bio?: Maybe<Scalars['String']>;
  city?: Maybe<City>;
  country?: Maybe<Country>;
  countryOfCitizenship?: Maybe<Scalars['String']>;
  /** Identifies the date and time when the object was created. */
  createdAt?: Maybe<Scalars['DateTime']>;
  dateOfBirth?: Maybe<Scalars['DateTime']>;
  dateOfDeath?: Maybe<Scalars['DateTime']>;
  id: Scalars['ID'];
  name: Scalars['String'];
  placeOfBirth?: Maybe<Scalars['String']>;
  placeOfBurial?: Maybe<Scalars['String']>;
  placeOfDeath?: Maybe<Scalars['String']>;
  quote?: Maybe<Scalars['String']>;
  religion?: Maybe<Scalars['String']>;
  state?: Maybe<State>;
  totalWorshipAmount?: Maybe<Scalars['Int']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']>;
  wikiAvatar?: Maybe<Scalars['String']>;
  wikiDataId?: Maybe<Scalars['String']>;
};

export type WorshipedPersonConnection = {
  __typename?: 'WorshipedPersonConnection';
  edges?: Maybe<Array<WorshipedPersonEdge>>;
  pageInfo: PageInfo;
  totalCount?: Maybe<Scalars['Int']>;
};

export type WorshipedPersonEdge = {
  __typename?: 'WorshipedPersonEdge';
  cursor: Scalars['String'];
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
