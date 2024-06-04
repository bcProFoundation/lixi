import { createSelector } from 'reselect';

import { LixiStoreStateInterface } from '../state';

import { countriesAdapter, statesAdapter } from './reducer';
import { CountriesState } from './state';

export const getCountriesState = createSelector(
  (state: LixiStoreStateInterface) => state.countries,
  (countries: CountriesState) => countries
);

// Country
const { selectAll, selectEntities, selectIds, selectTotal } = countriesAdapter.getSelectors();

export const getAllCountries = createSelector((state: LixiStoreStateInterface) => state.countries, selectAll);

export const getAllCountriesEntities = createSelector(
  (state: LixiStoreStateInterface) => state.countries,
  selectEntities
);

// State
const selectCountry = (state: LixiStoreStateInterface) => state.countries;
const selectSelectedCountry = createSelector(selectCountry, state => state.selectedCountryId);

const {
  selectAll: selectAllStates,
  selectEntities: selectEntitiesStates,
  selectIds: selectIdsStates,
  selectTotal: selectTotalStates
} = statesAdapter.getSelectors();

export const getAllStates = createSelector((state: LixiStoreStateInterface) => state.states, selectAllStates);
