import { Lixi } from '@bcpros/lixi-models/lib/lixi';
import { EntityState } from '@reduxjs/toolkit';

export interface LixiesState extends EntityState<Lixi, number> {
  selectedId: number;
  claimIdsById: {
    [key: number]: Array<number>;
  };
  subLixies: EntityState<Lixi, number>;
  subLixiesCount: number;
  currentSubLixiesStartId: number;
  hasMoreSubLixies: boolean;
}
