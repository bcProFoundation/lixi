import { Token } from '@bcpros/lixi-models';
import { EntityState } from '@reduxjs/toolkit';

export type TokenState = EntityState<Token> & {
  selectedTokenId: object;
  getTokenById: object;
}
