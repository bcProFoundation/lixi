import type { ColumnType } from 'kysely';
export type Generated<T> =
  T extends ColumnType<infer S, infer I, infer U> ? ColumnType<S, I | undefined, U> : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

import type {
  PostType,
  CommentType,
  Role,
  BurnType,
  AccountDanaHistoryType,
  NotificationLevel,
  UserTwoFactorType,
  ImageUploadableType,
  MessageType,
  PageMessageSessionStatus,
  BookmarkType,
  EventType,
  OfferType,
  OfferStatus,
  DisputeStatus,
  EscrowOrderStatus,
  AddressType,
  Coin,
  AccountType
} from './enums';

export type Account = {
  id: Generated<number>;
  name: string;
  account_type: Generated<AccountType>;
  encrypted_mnemonic: string | null;
  encrypted_secret: Generated<string | null>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  mnemonic_hash: string | null;
  address: Generated<string>;
  hash_160: Generated<Buffer>;
  language: Generated<string>;
  secondary_language: string | null;
  public_key: Generated<string>;
  email: string | null;
  description: Generated<string>;
  day_of_birth: number | null;
  month_of_birth: number | null;
  year_of_birth: number | null;
  website: Generated<string>;
  create_comment_fee: Generated<string>;
  account_avatar_image_uploadable_id: string | null;
  account_cover_image_uploadable_id: string | null;
  role: Generated<Role>;
  telegram_id: string | null;
  telegram_username: string | null;
  anonymous_username_localecash: string | null;
};
export type AccountDana = {
  id: string;
  account_id: number;
  dana_given: Generated<number>;
  dana_received: Generated<number>;
  dana_burn_up: Generated<number>;
  dana_burn_down: Generated<number>;
  dana_burn_score: Generated<number>;
  dana_received_up: Generated<number>;
  dana_received_down: Generated<number>;
  dana_received_score: Generated<number>;
  version: Generated<number>;
};
export type AccountDanaHistory = {
  id: string;
  accountDanaId: string | null;
  txid: string;
  burn_type: BurnType;
  burn_for_type: number;
  burned_for_id: string;
  given_up_value: Generated<number | null>;
  given_down_value: Generated<number | null>;
  received_up_value: Generated<number | null>;
  received_down_value: Generated<number | null>;
  type: AccountDanaHistoryType | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
};
export type BankInfo = {
  id: string;
  orderId: string;
  bank_name: string | null;
  account_name_bank: string | null;
  account_number_bank: string | null;
  app_name: string | null;
  account_name_app: string | null;
  account_number_app: string | null;
};
export type Bookmark = {
  id: string;
  account_id: number;
  bookmarkable_id: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
};
export type Bookmarkable = {
  id: string;
  type: BookmarkType;
};
export type BoostFee = {
  id: string;
  txid: string;
  boost_type: boolean;
  boost_for_type: number;
  boosted_by_hash: string;
  boosted_for_id: string;
  boosted_value: Generated<number>;
  created_at: Generated<Timestamp | null>;
  updated_at: Generated<Timestamp | null>;
};
export type Burn = {
  id: string;
  txid: string;
  burn_type: boolean;
  burn_for_type: number;
  burned_by: Buffer;
  burned_for_id: string;
  burned_value: Generated<number>;
  created_at: Generated<Timestamp | null>;
  updated_at: Generated<Timestamp | null>;
  coinBurned: Generated<Coin | null>;
};
export type Category = {
  id: Generated<number>;
  name: Generated<string>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
};
export type ChronikWatchAddress = {
  id: string;
  account_id: number;
  hash_160: string;
  type: string;
  created_at: Generated<Timestamp>;
};
export type City = {
  id: Generated<number>;
  name: string;
  state_code: string;
  country_code: string;
  latitude: string;
  longitude: string;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  flag: Generated<boolean>;
  wiki_data_id: string | null;
  country_id: number;
  state_id: number;
};
export type Claim = {
  id: Generated<number>;
  ip_address: string;
  transaction_id: string;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  claim_address: string;
  amount: string;
  lixi_id: number;
  nft_token_id: string | null;
  nft_token_url: Generated<string>;
};
export type Comment = {
  id: string;
  comment_account_id: number | null;
  comment_by_public_key: string | null;
  comment_to_id: string;
  commentable_id: string | null;
  comment_text: Generated<string>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  dana_burn_up: Generated<number>;
  dana_burn_down: Generated<number>;
  dana_burn_score: Generated<number>;
  create_fee: number | null;
  txid: string | null;
  comment_image_uploadable_id: string | null;
  parentId: string | null;
  rootId: string | null;
};
export type Commentable = {
  id: string;
  type: Generated<CommentType>;
};
export type CommentDana = {
  dana_burn_up: Generated<number>;
  dana_burn_down: Generated<number>;
  dana_burn_score: Generated<number>;
  comment_id: string;
  version: Generated<number>;
};
export type Country = {
  id: Generated<number>;
  name: string;
  iso3: string | null;
  iso2: string | null;
  numeric_code: string | null;
  phone_code: string | null;
  capital: string | null;
  currency: string | null;
  currency_name: string | null;
  currency_symbol: string | null;
  tld: string | null;
  native: string | null;
  region: string | null;
  sub_region: string | null;
  timezones: string | null;
  translations: string | null;
  latitude: string | null;
  longitude: string | null;
  emoji: string | null;
  emoji_u: string | null;
  created_at: Timestamp | null;
  updated_at: Generated<Timestamp>;
  flag: Generated<boolean>;
  wiki_data_id: string | null;
};
export type Dispute = {
  id: string;
  escrow_order_id: string;
  created_by: string;
  reason: string | null;
  status: Generated<DisputeStatus>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
};
export type EmailTemplate = {
  id: string;
  slug: Generated<string>;
  description: string;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
};
export type EmailTemplateTranslation = {
  id: string;
  sender: Generated<string>;
  email_template_id: string;
  title: Generated<string>;
  body: Generated<string>;
  subject: Generated<string>;
  language: string;
  is_default: boolean | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
};
export type Envelope = {
  id: Generated<number>;
  name: string;
  thumbnail: string;
  image: string;
  slug: string;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  description: Generated<string>;
};
export type EscrowOrder = {
  id: string;
  seller_account_id: number;
  buyer_account_id: number;
  arbitrator_account_id: number;
  moderator_account_id: number;
  escrow_address: string;
  release_txid: string | null;
  return_txid: string | null;
  payment_method_id: number;
  message: string | null;
  price: string;
  amount: Generated<number>;
  amount_coin_or_currency: Generated<number>;
  offer_id: string;
  status: Generated<EscrowOrderStatus>;
  escrow_script: Buffer;
  release_signatory: Buffer | null;
  return_signatory: Buffer | null;
  signatory_owner_hash160: Buffer | null;
  nonce: string;
  buyer_deposit_tx: string | null;
  seller_telegram_message_id: number | null;
  buyer_telegram_message_id: number | null;
  seller_donate_amount: number | null;
  buyer_donate_amount: number | null;
  mark_as_paid: Generated<boolean | null>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
};
export type EscrowTxId = {
  txid: string;
  outIdx: number;
  value: string;
  escrowOrderId: string;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
};
export type Event = {
  postId: string;
  name: string;
  description: string | null;
  start_date: Timestamp;
  end_date: Timestamp;
  location: string | null;
  eventType: EventType;
};
export type FeatureFlag = {
  id: Generated<number>;
  name: string;
  enabled: Generated<boolean>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
};
export type FollowAccount = {
  id: string;
  follower_account_id: number;
  following_account_id: number;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
};
export type FollowPage = {
  id: string;
  account_id: number;
  page_id: string | null;
  token_id: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
};
export type GiveTip = {
  id: string;
  txid: string;
  from_address: string;
  from_account_id: number;
  to_address: string;
  to_account_id: number;
  comment_id: string;
  tip_value: number;
  created_at: Generated<Timestamp | null>;
};
export type GiveTipMessage = {
  id: string;
  txid: string;
  from_address: string;
  from_account_id: number;
  to_address: string;
  to_account_id: number;
  message_id: string;
  tip_value: number;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
};
export type Handle = {
  id: string;
  network: Generated<Coin>;
  name: string;
  address: Generated<string>;
  block_height: number;
  status: Generated<string>;
  txid: string;
};
export type Hashtag = {
  id: string;
  content: string;
  normalizedContent: string;
  dana_burn_up: Generated<number>;
  dana_burn_down: Generated<number>;
  dana_burn_score: Generated<number>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
};
export type HashtagDana = {
  dana_received_up: Generated<number>;
  dana_received_down: Generated<number>;
  dana_received_score: Generated<number>;
  dana_burn_up: Generated<number>;
  dana_burn_down: Generated<number>;
  dana_burn_score: Generated<number>;
  hashtag_id: string;
  version: Generated<number>;
};
export type ImageUploadable = {
  id: string;
  account_id: number;
  image_uploadable_type: ImageUploadableType | null;
};
export type Lixi = {
  id: Generated<number>;
  name: string;
  max_claim: Generated<number>;
  claimed_num: Generated<number>;
  claim_type: Generated<number>;
  lixi_type: Generated<number>;
  min_value: number;
  max_value: number;
  fixed_value: number;
  divided_value: Generated<number>;
  encrypted_xpriv: string;
  encrypted_claim_code: string;
  total_claim: Generated<string>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  min_staking: Generated<number>;
  expiry_at: Timestamp | null;
  activation_at: Timestamp | null;
  country: string | null;
  is_family_friendly: boolean;
  join_lottery_program: Generated<boolean>;
  status: Generated<string>;
  previous_status: Generated<string>;
  invetory_status: Generated<string>;
  account_id: number;
  derivation_index: Generated<number>;
  address: string;
  amount: Generated<number>;
  sub_lixi_value: number | null;
  parent_id: number | null;
  envelope_id: number | null;
  envelope_message: Generated<string>;
  check_claim: Generated<boolean | null>;
  is_nft_enabled: Generated<boolean>;
  number_lixi_per_package: number | null;
  package_id: number | null;
  upload_detail_id: string | null;
  network_type: Generated<string>;
  lixi_image_uploadable_id: string | null;
};
export type LixiDistribution = {
  id: string;
  address: string;
  type: string;
  lixiId: number;
};
export type Message = {
  id: string;
  body: string | null;
  author_id: number;
  is_page_owner: boolean | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  page_message_session_id: string | null;
  messageType: Generated<MessageType | null>;
  image_uploadable_id: string | null;
};
export type Notification = {
  id: string;
  message: Generated<string>;
  readAt: Timestamp | null;
  deletedAt: Timestamp | null;
  sender_id: number | null;
  additional_data: unknown | null;
  type_id: number;
  level: NotificationLevel;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  status: Generated<string>;
  recipient_id: number | null;
  url: string | null;
  action: string | null;
};
export type NotificationType = {
  id: Generated<number>;
  name: Generated<string>;
  description: string;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
};
export type NotificationTypeTranslation = {
  id: Generated<number>;
  notification_type_id: number;
  language: string;
  is_default: boolean | null;
  template: string;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
};
export type Offer = {
  post_id: string;
  public_key: string;
  message: string;
  note_offer: Generated<string | null>;
  price: string;
  coin_payment: string | null;
  coin_others: Generated<string | null>;
  margin_percentage: Generated<number>;
  local_currency: string | null;
  payment_app: string | null;
  coin: Generated<Coin>;
  order_limit_min: Generated<number>;
  order_limit_max: Generated<number>;
  type: Generated<OfferType>;
  status: Generated<OfferStatus>;
  country_id: number | null;
  state_id: number | null;
  location_id: string | null;
  telegram_message_id: string | null;
  hide_from_home: Generated<boolean | null>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
};
export type OfferPaymentMethod = {
  id: string;
  offer_id: string;
  payment_method_id: number;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
};
export type Package = {
  id: Generated<number>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  registrant: string | null;
};
export type Page = {
  id: string;
  page_account_id: number;
  name: Generated<string>;
  title: Generated<string>;
  category_id: number | null;
  description: Generated<string>;
  parent_id: string | null;
  website: Generated<string>;
  country_id: number | null;
  state_id: number | null;
  address: Generated<string>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  dana_burn_up: Generated<number>;
  dana_burn_down: Generated<number>;
  dana_burn_score: Generated<number>;
  create_post_fee: Generated<string>;
  create_comment_fee: Generated<string>;
  encrypted_mnemonic: string | null;
  salt: string | null;
  total_posts_burn_up: Generated<number>;
  total_posts_burn_down: Generated<number>;
  total_posts_burn_score: Generated<number>;
  access_message_fee: Generated<number | null>;
  min_dana_for_message: Generated<number | null>;
  follower_free_message: Generated<boolean | null>;
  page_avatar_image_uploadable_id: string | null;
  page_cover_image_uploadable_id: string | null;
};
export type PageDana = {
  dana_received_up: Generated<number>;
  dana_received_down: Generated<number>;
  dana_received_score: Generated<number>;
  dana_burn_up: Generated<number>;
  dana_burn_down: Generated<number>;
  dana_burn_score: Generated<number>;
  page_id: string;
  version: Generated<number>;
};
export type PageMessageSession = {
  id: string;
  name: string | null;
  page_id: string;
  account_id: number;
  lixi_id: number | null;
  lixi_claim_code: string | null;
  session_opened_at: Timestamp | null;
  session_closed_at: Timestamp | null;
  status: Generated<PageMessageSessionStatus | null>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
};
export type PaymentMethod = {
  id: Generated<number>;
  name: string;
  message: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
};
export type PersonOnTemple = {
  id: string;
  temple_id: string;
  worshiped_person_id: string;
};
export type Poll = {
  postId: string;
  question: string;
  start_date: Timestamp;
  end_date: Timestamp;
  single_select: Generated<boolean>;
  can_add_option: Generated<boolean>;
};
export type PollAnswerOnAccount = {
  account_id: number;
  poll_option_id: string;
  created_at: Generated<Timestamp>;
  poll_dana_score: Generated<number>;
};
export type PollOption = {
  id: string;
  poll_id: string;
  option: string;
};
export type Post = {
  id: string;
  account_id: number;
  page_id: string | null;
  token_id: string | null;
  content: Generated<string>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  dana_burn_up: Generated<number>;
  dana_burn_down: Generated<number>;
  dana_burn_score: Generated<number>;
  create_fee: number | null;
  txid: string | null;
  updated_repost_at: Generated<Timestamp>;
  original_language: string | null;
  commentable_id: string | null;
  bookmarkable_id: string | null;
  taggableId: string | null;
  post_image_uploadable_id: string | null;
  type: Generated<PostType>;
};
export type PostBoostScore = {
  boost_received_up: Generated<number>;
  boost_received_down: Generated<number>;
  boost_received_score: Generated<number>;
  boost_up: Generated<number>;
  boost_down: Generated<number>;
  boost_score: Generated<number>;
  post_id: string;
  version: Generated<number>;
};
export type PostDana = {
  dana_received_up: Generated<number>;
  dana_received_down: Generated<number>;
  dana_received_score: Generated<number>;
  dana_burn_up: Generated<number>;
  dana_burn_down: Generated<number>;
  dana_burn_score: Generated<number>;
  post_id: string;
  version: Generated<number>;
};
export type PostHashtag = {
  id: string;
  hashtagId: string;
  postId: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
};
export type PostTranslation = {
  id: string;
  post_id: string;
  translate_language: string | null;
  translate_content: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
};
export type Product = {
  postId: string;
  title: Generated<string>;
  price: Generated<number>;
  price_unit: Generated<string>;
  phone_number: Generated<string>;
  category_id: number | null;
  description: Generated<string>;
  country_id: number | null;
  state_id: number | null;
  address: Generated<string | null>;
};
export type Repost = {
  id: string;
  account_id: number;
  post_id: string;
  txid: string | null;
  repost_fee: Generated<number | null>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
};
export type RepostDana = {
  dana_burn_up: Generated<number>;
  dana_burn_down: Generated<number>;
  dana_burn_score: Generated<number>;
  repost_id: string;
  version: Generated<number>;
};
export type SeedVersion = {
  id: string;
  name: string;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
};
export type Setting = {
  id: string;
  accountId: number;
  lastSeedBackupTime: Timestamp | null;
  use_public_local_user_name: Generated<boolean>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
};
export type State = {
  id: Generated<number>;
  name: string;
  country_code: string;
  fips_code: string | null;
  iso2: string | null;
  type: string | null;
  latitude: string | null;
  longitude: string | null;
  created_at: Timestamp | null;
  updated_at: Generated<Timestamp>;
  flag: Generated<boolean>;
  wiki_data_id: string | null;
  country_id: number;
};
export type Taggable = {
  id: string;
};
export type TagSet = {
  id: string;
  taggableId: string;
  hashtagId: string;
};
export type Temple = {
  id: string;
  name: string;
  accountId: number;
  achievement: string | null;
  description: string | null;
  alias: string | null;
  religion: string | null;
  address: string | null;
  president: string | null;
  website: string | null;
  verified: Generated<boolean>;
  date_of_completed: Timestamp | null;
  day_of_completed: number | null;
  month_of_completed: number | null;
  year_of_completed: number | null;
  total_worship_amount: Generated<number>;
  cityId: number | null;
  countryId: number | null;
  stateId: number | null;
  created_at: Generated<Timestamp | null>;
  updated_at: Generated<Timestamp | null>;
  temple_avatar_image_uploadable_id: string | null;
  temple_cover_image_uploadable_id: string | null;
};
export type Token = {
  id: string;
  token_id: string;
  token_type: Generated<string>;
  name: Generated<string>;
  ticker: Generated<string>;
  decimals: number;
  token_document_url: Generated<string>;
  total_burned: Generated<string>;
  total_minted: Generated<string>;
  initial_token_quantity: Generated<string>;
  comments: Generated<Timestamp | null>;
  created_at: Generated<Timestamp>;
  created_date: Generated<Timestamp>;
};
export type TokenDana = {
  dana_received_up: Generated<number>;
  dana_received_down: Generated<number>;
  dana_received_score: Generated<number>;
  dana_burn_up: Generated<number>;
  dana_burn_down: Generated<number>;
  dana_burn_score: Generated<number>;
  token_id: string;
  version: Generated<number>;
};
export type Upload = {
  id: string;
  original_filename: string;
  file_size: number | null;
  width: number | null;
  height: number | null;
  url: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  sha: string | null;
  extension: string | null;
  thumbnail_width: number | null;
  thumbnail_height: number | null;
  type: string | null;
  bucket: string | null;
  cf_image_id: string | null;
  cf_image_filename: string | null;
  image_uploadable_id: string | null;
};
export type UploadDetail = {
  id: string;
  account_id: number;
  upload_id: string;
  lixi_id: number | null;
  page_cover_id: string | null;
  page_avatar_id: string | null;
  post_cover_id: string | null;
  worshipedPerson_avatar_id: string | null;
  temple_avatar_id: string | null;
  temple_cover_id: string | null;
  avatarAccountId: number | null;
  coverAccountId: number | null;
  messageId: string | null;
};
export type WalletPath = {
  id: string;
  path: string;
  address: string;
  hash160: string;
  type: AddressType;
  public_key: string;
  account_id: number;
  network: Generated<Coin>;
};
export type WebpushSubscriber = {
  id: string;
  client_app_id: string;
  auth: string;
  p256dh: string;
  endpoint: string;
  device_id: string;
  account_id: number | null;
  address: string;
  expiration_time: Timestamp | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
};
export type Worldcities = {
  city: string | null;
  city_ascii: string | null;
  city_alt: string | null;
  lat: Generated<number | null>;
  lng: Generated<number | null>;
  country: string | null;
  iso2: string | null;
  iso3: string | null;
  admin_name: string | null;
  admin_name_ascii: string | null;
  admin_code: string | null;
  admin_type: string | null;
  capital: string | null;
  density: Generated<number | null>;
  population: string | null;
  population_proper: string | null;
  ranking: number | null;
  timezone: string | null;
  same_name: string | null;
  id: string;
};
export type Worship = {
  id: string;
  accountId: number;
  worshipedPersonId: string | null;
  templeId: string | null;
  lotus_worship_amount: Generated<number>;
  location: string | null;
  latitude: string | null;
  longitude: string | null;
  created_at: Generated<Timestamp | null>;
  updated_at: Generated<Timestamp | null>;
};
export type WorshipedPerson = {
  id: string;
  name: string;
  wikiAvatar: string | null;
  country_of_citizenship: string | null;
  achievement: string | null;
  bio: string | null;
  alias: string | null;
  religion: string | null;
  wiki_data_id: string | null;
  quote: Generated<string | null>;
  place_of_birth: string | null;
  place_of_death: string | null;
  place_of_burial: string | null;
  date_of_birth: Timestamp | null;
  day_of_birth: number | null;
  month_of_birth: number | null;
  year_of_birth: number | null;
  date_of_death: Timestamp | null;
  day_of_death: number | null;
  month_of_death: number | null;
  year_of_death: number | null;
  created_at: Generated<Timestamp | null>;
  updated_at: Generated<Timestamp | null>;
  total_worship_amount: Generated<number>;
  cityId: number | null;
  countryId: number | null;
  stateId: number | null;
};
export type DB = {
  account: Account;
  account_dana: AccountDana;
  account_dana_history: AccountDanaHistory;
  bank_info: BankInfo;
  bookmark: Bookmark;
  bookmarkable: Bookmarkable;
  boost_fee: BoostFee;
  burn: Burn;
  category: Category;
  chronik_watch_address: ChronikWatchAddress;
  city: City;
  claim: Claim;
  comment: Comment;
  comment_dana: CommentDana;
  commentable: Commentable;
  country: Country;
  dispute: Dispute;
  email_template: EmailTemplate;
  email_template_translation: EmailTemplateTranslation;
  envelope: Envelope;
  escrow_order: EscrowOrder;
  EscrowTxId: EscrowTxId;
  event: Event;
  feature_flag: FeatureFlag;
  follow_account: FollowAccount;
  follow_page: FollowPage;
  give_tip: GiveTip;
  give_tip_messsage: GiveTipMessage;
  handle: Handle;
  hashtag: Hashtag;
  hashtag_dana: HashtagDana;
  image_uploadable: ImageUploadable;
  lixi: Lixi;
  lixi_distribution: LixiDistribution;
  message: Message;
  notification: Notification;
  notification_type: NotificationType;
  notification_type_translation: NotificationTypeTranslation;
  offer: Offer;
  offer_payment_method: OfferPaymentMethod;
  package: Package;
  page: Page;
  page_dana: PageDana;
  page_message_session: PageMessageSession;
  payment_method: PaymentMethod;
  person_on_temple: PersonOnTemple;
  poll: Poll;
  poll_option: PollOption;
  pollawnswer_on_account: PollAnswerOnAccount;
  post: Post;
  post_boost_score: PostBoostScore;
  post_dana: PostDana;
  post_hashtag: PostHashtag;
  post_translation: PostTranslation;
  product: Product;
  repost: Repost;
  repost_dana: RepostDana;
  seed_version: SeedVersion;
  Setting: Setting;
  state: State;
  taggable: Taggable;
  tagset: TagSet;
  Temple: Temple;
  token: Token;
  token_dana: TokenDana;
  upload: Upload;
  upload_detail: UploadDetail;
  wallet_path: WalletPath;
  webpush_subscription: WebpushSubscriber;
  world_cities: Worldcities;
  Worship: Worship;
  WorshipedPerson: WorshipedPerson;
};
