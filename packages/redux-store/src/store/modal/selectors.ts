import { createSelector } from 'reselect';

import { LixiStoreStateInterface } from '../state';

import { ModalState } from './state';

export const getModals = createSelector(
  (state: LixiStoreStateInterface) => state.modal,
  (state: ModalState) => state.modals
);
