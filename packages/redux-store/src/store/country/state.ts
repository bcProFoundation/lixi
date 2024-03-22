import { Country, State } from '@bcpros/lixi-models';
import { EntityState } from '@reduxjs/toolkit';

export interface CountriesState extends EntityState<Country, number> {
  selectedCountryId: number;
}

export interface StatesState extends EntityState<State, number> {
  selectedStateId: number;
}
