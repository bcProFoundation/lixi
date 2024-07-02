import { Burn } from '@bcpros/lixi-models/lib/burn/burn.model';

export interface BurnState {
  burnQueue: Array<any>;
  failQueue: Array<any>;
  latestBurnForPost: Burn;
  latestBurnForToken: Burn;
  latestBurnForPage: Burn;
}
