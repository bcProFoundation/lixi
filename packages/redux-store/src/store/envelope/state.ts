import { Envelope } from '@bcpros/lixi-models';
import { EntityState } from '@reduxjs/toolkit';

export interface EnvelopesState extends EntityState<Envelope, number> {
  selectedId: number;
}
