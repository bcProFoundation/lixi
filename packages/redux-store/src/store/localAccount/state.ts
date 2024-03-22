import { LocalUserAccount } from '@bcpros/lixi-models/lib/account';
import { EntityState } from '@reduxjs/toolkit';

export interface LocalUserAccountsState extends EntityState<LocalUserAccount, string> {
  selectedId: Nullable<string> | undefined;
}
