import { Token } from '@bcpros/lixi-models';
import { createSelector } from 'reselect';

import { LixiStoreStateInterface } from '../state';

import { tokenAdapter } from './reducer';
import { TokenState } from './state';

const selectAccounts = (state: LixiStoreStateInterface) => state.accounts;
const selectSelectedAccount = createSelector(selectAccounts, state => state.selectedId);

const { selectAll, selectEntities, selectIds, selectTotal } = tokenAdapter.getSelectors();

export const selectTokens = createSelector((state: LixiStoreStateInterface) => state.tokens, selectAll);

export const getAllTokensEntities = createSelector((state: LixiStoreStateInterface) => state.tokens, selectEntities);

export const getSelectedToken = createSelector(
  (state: LixiStoreStateInterface) => state.tokens,
  (state: TokenState) => state.selectedTokenId as Token
);

export const getTokenById = (id: string) => createSelector(getAllTokensEntities, tokens => tokens?.[id]);
