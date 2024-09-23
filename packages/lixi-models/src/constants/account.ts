import { COIN } from './coins/coin';

export enum AccountType {
  NORMAL = 'NORMAL',
  NONCUSTODIAL = 'NONCUSTODIAL'
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
