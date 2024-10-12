import { City } from '@bcpros/lixi-models/lib/geo-location/city.model';
import { Country } from '@bcpros/lixi-models/lib/geo-location/country.model';
import { State } from '@bcpros/lixi-models/lib/geo-location/state.model';
import { createAction } from '@reduxjs/toolkit';

export const getCountryActionType = 'country/getCountries';

export const getCountries = createAction('lixi/getCountries');
export const getCountriesSuccess = createAction<Country[]>('lixi/getCountriesSuccess');
export const getCountriesFailure = createAction<string>('lixi/getCountriesFailure');

export const getStates = createAction<number | string>('lixi/getState');
export const getStatesSuccess = createAction<State[]>('lixi/getStateSuccess');
export const getStatesFailure = createAction<string>('lixi/getStateFailure');

export const getCities = createAction<number | string>('lixi/getCities');
export const getCitiesSuccess = createAction<City[]>('lixi/getCitiesSuccess');
export const getCitiesFailure = createAction<string>('lixi/getCitiesFailure');
