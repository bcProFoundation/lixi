import { COIN } from './coins/coin';

export enum AccountType {
  NORMAL = 'NORMAL',
  NONCUSTODIAL = 'NONCUSTODIAL'
}

export enum Role {
  USER = 'USER',
  ARBITRATOR = 'ARBITRATOR',
  MODERATOR = 'MODERATOR'
}

export type GenerateAccountType = {
  coin?: COIN;
  telegramId?: string;
  accountType?: AccountType;
};

export type ImportAccountType = {
  mnemonic: string;
  coin: COIN;
};

export type SilentLoginType = {
  mnemonic: string;
  coin: COIN;
};
