import { Country } from '@bcpros/lixi-models/lib/geo-location/country.model';
import { State } from '@bcpros/lixi-models/lib/geo-location/state.model';
import { createEntityAdapter, createReducer, isAnyOf, Update } from '@reduxjs/toolkit';

import { getCitiesSuccess, getCountriesSuccess, getStatesSuccess } from './actions';
import { CitiesState, CountriesState, StatesState } from './state';
import { City } from '@bcpros/lixi-models';

// Coutry
export const countriesAdapter = createEntityAdapter<Country>({});
const initialCountry: CountriesState = countriesAdapter.getInitialState({
  selectedCountryId: 0
});

export const countryReducer = createReducer(initialCountry, builder => {
  builder.addCase(getCountriesSuccess, (state, action) => {
    const countries = action.payload;
    countriesAdapter.setAll(state, countries);
  });
});

// State
export const statesAdapter = createEntityAdapter<State>({});
const initialState: StatesState = statesAdapter.getInitialState({
  selectedStateId: 0
});

export const stateReducer = createReducer(initialState, builder => {
  builder.addCase(getStatesSuccess, (state, action) => {
    const states = action.payload;
    statesAdapter.setAll(state, states);
  });
});

// City
export const citiesAdapter = createEntityAdapter<City>({});
const initialCity: CitiesState = citiesAdapter.getInitialState({
  selectedCityId: 0
});

export const cityReducer = createReducer(initialCity, builder => {
  builder.addCase(getCitiesSuccess, (state, action) => {
    const cities = action.payload;
    citiesAdapter.setAll(state, cities);
  });
});
