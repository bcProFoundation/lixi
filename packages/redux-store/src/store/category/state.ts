import { PageCategory } from '@bcpros/lixi-models/lib/pageCategory';
import { EntityState } from '@reduxjs/toolkit';

export interface CategoriesState extends EntityState<PageCategory, number> {
  selectedCategoryId: number;
}
