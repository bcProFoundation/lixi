import { COIN } from '@bcpros/lixi-models/constants/coins/coin';

export type LocalUser = {
  id: string;
  address: string;
  name: string;
  isLocalLoggedIn?: boolean;
  coin: COIN;
};
