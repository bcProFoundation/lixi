import { createSelector } from 'reselect';

import { LixiStoreStateInterface } from '../state';

import { claimsAdapter } from './reducer';
import { ClaimsState } from './state';

const { selectAll, selectEntities, selectIds, selectTotal } = claimsAdapter.getSelectors();

export const getAllClaims = createSelector((state: LixiStoreStateInterface) => state.claims, selectAll);

export const getAllClaimsEntities = createSelector((state: LixiStoreStateInterface) => state.claims, selectEntities);

export const getCurrentAddress = createSelector(
  (state: LixiStoreStateInterface) => state.claims,
  (state: ClaimsState) => state.currentAddress
);

export const getCurrentClaimCode = createSelector(
  (state: LixiStoreStateInterface) => state.claims,
  (state: ClaimsState) => state.currentClaimCode
);
export const getCurrentLixiClaim = createSelector(
  (state: LixiStoreStateInterface) => state.claims,
  (state: ClaimsState) => state.currentLixiClaim
);
