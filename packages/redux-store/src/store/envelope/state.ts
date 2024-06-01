import { Envelope } from '@bcpros/lixi-models/lib/envelope';
import { EntityState } from '@reduxjs/toolkit';

export interface EnvelopesState extends EntityState<Envelope, number> {
  selectedId: number;
}
