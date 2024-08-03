import { IsNotEmpty } from 'class-validator';

import { WORSHIP_TYPES } from '../../constants/worship';

import { BurnForType, BurnType } from './burn.model';
import { COIN } from '../../constants/coins/coin';

export class BurnCommand {
  @IsNotEmpty()
  txHex: string;

  @IsNotEmpty()
  burnType: BurnType;

  @IsNotEmpty()
  burnForType: BurnForType;

  @IsNotEmpty()
  burnedBy: string;

  @IsNotEmpty()
  burnForId: string;

  @IsNotEmpty()
  burnValue: string;

  @IsNotEmpty()
  amountDana: number;

  @IsNotEmpty()
  coinBurned: COIN;

  postQueryTags?: string;

  pageId?: string;

  tokenId?: string;

  tipToAddresses?: { address: string; amount: string }[];

  // Params to patch rtk query data
  queryParams?: any;

  worshipType?: WORSHIP_TYPES;
}

export class BurnQueueCommand {
  txHex?: string;

  @IsNotEmpty()
  burnType: BurnType;

  @IsNotEmpty()
  burnForType: BurnForType;

  @IsNotEmpty()
  burnedBy: string;

  @IsNotEmpty()
  burnForId: string;

  @IsNotEmpty()
  burnValue: string;

  @IsNotEmpty()
  amountDana: number;

  @IsNotEmpty()
  coinBurned: COIN;

  utxos?: any;

  defaultFee: number;

  tipToHashes?: { hash: string; amount: string }[];

  worshipType?: WORSHIP_TYPES;

  extraArguments?: BurnExtraArguments;
}

export class BurnExtraArguments {
  query?: string;

  hashtags?: string[];

  postQueryTags?: string[];

  minBurnFilter?: number;

  level?: number;

  pageId?: string;

  tokenId?: string;

  postId?: string;

  userId?: number;

  hashtagId?: string;

  orderBy?: any;
}
