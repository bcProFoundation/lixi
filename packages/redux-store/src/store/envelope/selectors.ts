import { createSelector } from 'reselect';

import { LixiStoreStateInterface } from '../state';

import { envelopesAdapter } from './reducer';
import { EnvelopesState } from './state';

const { selectAll, selectEntities, selectIds, selectTotal } = envelopesAdapter.getSelectors();

export const getAllEnvelopes = createSelector((state: LixiStoreStateInterface) => state.envelopes, selectAll);

export const getAllEnvelopesEntities = createSelector(
  (state: LixiStoreStateInterface) => state.envelopes,
  selectEntities
);

export const getSelectedEnvelopeId = createSelector(
  (state: LixiStoreStateInterface) => state.envelopes,
  (envelopes: EnvelopesState) => envelopes.selectedId
);

export const getSelectedEnvelope = createSelector(
  (state: LixiStoreStateInterface) => state.envelopes,
  (envelopes: EnvelopesState) => (envelopes.selectedId ? envelopes.entities[envelopes.selectedId] : undefined)
);
