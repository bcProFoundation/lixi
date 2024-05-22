import _ from 'lodash';
import { createSelector } from 'reselect';

import { LixiStoreStateInterface } from '../state';

import { categoriesAdapter } from './reducer';
import { CategoriesState } from './state';

export const getCategoriesState = createSelector(
  (state: LixiStoreStateInterface) => state.categories,
  (categories: CategoriesState) => categories
);

const { selectAll, selectEntities, selectIds, selectTotal } = categoriesAdapter.getSelectors();

export const getAllCategories = createSelector((state: LixiStoreStateInterface) => state.categories, selectAll);

export const getAllCategoriesEntities = createSelector((state: LixiStoreStateInterface) => state.categories, selectEntities);
