import { AccountType } from '../../constants/account';
import { COIN } from '../../constants/coins/coin';

export class LocalUserAccount {
  name: string;
  address: string;
  mnemonic: string;
  language?: string;
  balance?: number;
  createdAt: Date;
  updatedAt: Date;
  rootCoin?: COIN;
  coin?: COIN;
  accountType?: AccountType;
}

export class RenameLocalUserAccountCommand {
  name: string;
  address: string;
}
