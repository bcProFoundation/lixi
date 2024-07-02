import { Token } from '@bcpros/lixi-models/lib/token/token.model';
import { EntityState } from '@reduxjs/toolkit';

export interface TokenState extends EntityState<Token, string> {
  selectedTokenId: object;
  getTokenById: object;
}
