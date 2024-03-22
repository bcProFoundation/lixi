import { Token } from '@bcpros/lixi-models';
import { EntityState } from '@reduxjs/toolkit';

export interface TokenState extends EntityState<Token, string> {
  selectedTokenId: object;
  getTokenById: object;
}
