import { COIN } from '../../constants';
export class LocalUserAccount {
  name: string;
  address: string;
  mnemonic: string;
  language?: string;
  balance?: number;
  createdAt: Date;
  updatedAt: Date;
  coin?: COIN;
}

export class RenameLocalUserAccountCommand {
  name: string;
  address: string;
}
