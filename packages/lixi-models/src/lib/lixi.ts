import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLDateTime } from 'graphql-scalars';

import { Account, MessageSession } from '../';

import { Distribution, DistributionModel } from './distribution';
import { Envelope, EnvelopeModel } from './envelope';
import { Upload } from './upload';

export interface GenerateLixiCommand {
  name: string;
  accountId: number;
  mnemonic: string;
  mnemonicHash: string;
  maxClaim: string;
  claimType: number;
  lixiType: number;
  minValue: string;
  maxValue: string;
  fixedValue: string;
  dividedValue: string;
  amount: string;
  numberOfSubLixi: string;
  parentId?: Nullable<number>;
  minStaking: string;
  expiryAt?: string;
  activationAt?: string;
  country?: string;
  networkType?: string;
  isFamilyFriendly: boolean;
  isNFTEnabled: boolean;
  envelopeId: Nullable<number>;
  envelopeMessage: string;
  shouldGroupToPackage: boolean;
  numberLixiPerPackage?: Nullable<string>;
  upload: Upload;
  staffAddress?: string;
  charityAddress?: string;
  joinLotteryProgram: boolean;
}

export interface CreateLixiCommand {
  name: string;
  accountId: number;
  maxClaim: number;
  claimType: number;
  lixiType: number;
  mnemonic: string;
  mnemonicHash: string;
  minValue: number;
  maxValue: number;
  fixedValue: number;
  dividedValue: number;
  amount: number;
  numberOfSubLixi?: Nullable<number>;
  parentId?: number;
  minStaking: number;
  expiryAt?: Date;
  activationAt?: Date;
  country?: string;
  networkType?: string;
  isFamilyFriendly: boolean;
  isNFTEnabled: boolean;
  password: string;
  envelopeId: Nullable<number>;
  envelopeMessage: string;
  numberLixiPerPackage?: Nullable<number>;
  uploadId?: Nullable<string>;
  staffAddress?: string;
  charityAddress?: string;
  joinLotteryProgram: boolean;
}

export interface LixiDto {
  id?: number;
  name: string;
  maxClaim: number;
  claimedNum: number;
  claimType: number;
  lixiType: number;
  claimCode?: string;
  minValue: number;
  maxValue: number;
  fixedValue: number;
  dividedValue: number;
  encryptedClaimCode?: string;
  totalClaim: number;
  createdAt?: Date;
  updatedAt?: Date;
  minStaking: number;
  expiryAt?: Date;
  activationAt?: Date;
  country?: string;
  networkType?: string;
  isFamilyFriendly?: boolean;
  balance?: number;
  address: string;
  status: string;
  inventoryStatus: string;
  accountId: number;
  amount: number;
  numberOfSubLixi: Nullable<number>;
  parentId?: Nullable<number>;
  isClaimed?: Nullable<boolean>;
  envelopeId: Nullable<number>;
  envelopeMessage: string;
  envelope?: Nullable<Envelope>;
  subLixiTotalClaim?: number;
  subLixiBalance?: number;
  isNFTEnabled: boolean;
  numberLixiPerPackage?: Nullable<number>;
  packageId?: Nullable<number>;
  joinLotteryProgram: boolean;
  distributions?: Nullable<Distribution[]>;
}

export interface Lixi {
  id: number;
  name: string;
  maxClaim: number;
  claimedNum: number;
  claimType: number;
  lixiType: number;
  claimCode?: string;
  minValue: number;
  maxValue: number;
  fixedValue: number;
  dividedValue: number;
  encryptedClaimCode: string;
  totalClaim: number;
  createdAt?: Date;
  updatedAt?: Date;
  minStaking: number;
  expiryAt?: Date;
  activationAt?: Nullable<Date>;
  country?: string;
  networkType?: string;
  isFamilyFriendly: boolean;
  balance?: number;
  address: string;
  status: string;
  inventoryStatus: string;
  accountId: number;
  amount: number;
  numberOfSubLixi: Nullable<number>;
  parentId?: Nullable<number>;
  isClaimed?: Nullable<boolean>;
  envelopeId: Nullable<number>;
  envelopeMessage: string;
  envelope?: Nullable<Envelope>;
  subLixiTotalClaim?: number;
  subLixiBalance?: number;
  isNFTEnabled: boolean;
  numberLixiPerPackage?: Nullable<number>;
  packageId?: Nullable<number>;
  joinLotteryProgram: boolean;
  distributions?: Nullable<Distribution[]>;
}

export interface RegisterLixiPackCommand {
  claimCode: string;
  account: Account;
  registrant: string;
}

export interface UnarchiveLixiCommand {
  id: number;
  mnemonic: string;
  mnemonicHash: string;
}

export interface ArchiveLixiCommand {
  id: number;
  mnemonic: string;
  mnemonicHash: string;
}

export interface WithdrawLixiCommand {
  id: number;
  mnemonic: string;
  mnemonicHash: string;
}

export interface RenameLixiCommand {
  id: number;
  mnemonic: string;
  mnemonicHash: string;
  name: string;
}

export interface ExportLixiCommand {
  id: number;
  mnemonicHash: string;
}

export enum LixiType {
  Random = 0,
  Fixed = 1,
  Divided = 2,
  Equal = 3
}

export enum ClaimType {
  Single = 0,
  OneTime = 1
}

export interface PostLixiResponseDto {
  lixi: Lixi;
  jobId?: string;
}

export interface DownloadExportedLixiCommand {
  lixiId: number;
  fileName: string;
  mnemonicHash: string;
}

export enum NetworkType {
  SingleIP = 'single-ip',
  FamilyFriendly = 'family-friendly',
  NoWifiRestriction = 'no-wifi-restriction'
}

export const LotteryAddress = 'lotus_16PSJM2jboGWYzs71usSip5hFhGTAyUw4nt3GS43u';

@ObjectType()
export class LixiModel {
  @Field(() => ID)
  id: number;

  @Field(() => String)
  name: string;

  @Field(() => Number)
  maxClaim: number;

  @Field(() => Number)
  claimedNum: number;

  @Field(() => Number)
  claimType: number;

  @Field(() => Number)
  lixiType: number;

  @Field(() => String, { nullable: true })
  claimCode?: string;

  @Field(() => Number)
  minValue: number;

  @Field(() => Number)
  maxValue: number;

  @Field(() => Number)
  fixedValue: number;

  @Field(() => Number)
  dividedValue: number;

  @Field(() => String)
  encryptedClaimCode: string;

  @Field(() => Number)
  totalClaim: number;

  @Field(() => Number)
  minStaking: number;

  @Field(() => String, { nullable: true })
  country?: string;

  @Field(() => String, { nullable: true })
  networkType?: string;

  @Field(() => Boolean)
  isFamilyFriendly: boolean;

  @Field(() => Number, { nullable: true })
  balance?: number;

  @Field(() => String)
  address: string;

  @Field(() => String)
  status: string;

  @Field(() => String)
  inventoryStatus: string;

  @Field(() => Number)
  accountId: number;

  @Field(() => String)
  amount: number;

  @Field(() => Number, { nullable: true })
  numberOfSubLixi?: number;

  @Field(() => Number, { nullable: true })
  parentId?: number;

  @Field(() => Boolean, { nullable: true })
  isClaimed?: boolean;

  @Field(() => EnvelopeModel, { nullable: true })
  envelope?: EnvelopeModel; //Envelop

  @Field(() => Number, { nullable: true })
  envelopeId?: number;

  @Field(() => String, { nullable: true })
  envelopeMessage?: string;

  @Field(() => Number, { nullable: true })
  subLixiTotalClaim?: number;

  @Field(() => Number, { nullable: true })
  subLixiBalance?: number;

  @Field(() => Boolean)
  isNFTEnabled: boolean;

  @Field(() => Number, { nullable: true })
  numberLixiPerPackage?: number;

  @Field(() => Number, { nullable: true })
  packageId?: number;

  @Field(() => Boolean)
  joinLotteryProgram: boolean;

  @Field(() => [DistributionModel], { nullable: true })
  distributions?: [DistributionModel];

  @Field(() => MessageSession, { nullable: true })
  messageSession?: MessageSession;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was expired.',
    nullable: true
  })
  expiryAt?: Date;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was activated.',
    nullable: true
  })
  activationAt?: Date;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was created.',
    nullable: true
  })
  createdAt?: Date;

  @Field(() => GraphQLDateTime, {
    description: 'Identifies the date and time when the object was last updated.',
    nullable: true
  })
  updatedAt?: Date;
}
