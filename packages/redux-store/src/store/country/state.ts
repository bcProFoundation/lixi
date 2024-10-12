import { City } from '@bcpros/lixi-models';
import { Country } from '@bcpros/lixi-models/lib/geo-location/country.model';
import { State } from '@bcpros/lixi-models/lib/geo-location/state.model';
import { EntityState } from '@reduxjs/toolkit';

export interface CountriesState extends EntityState<Country, number> {
  selectedCountryId: number;
}

export interface StatesState extends EntityState<State, number> {
  selectedStateId: number;
}

export interface CitiesState extends EntityState<City, number> {
  selectedCityId: number;
}
