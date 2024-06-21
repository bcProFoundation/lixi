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
}

export class RenameLocalUserAccountCommand {
  name: string;
  address: string;
}
