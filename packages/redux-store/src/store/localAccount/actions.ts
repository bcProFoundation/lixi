import { LocalUserAccount } from '@bcpros/lixi-models/lib/account/local-user-account.model';
import { createAction } from '@reduxjs/toolkit';
import { LocalUser } from '../../models/localUser';

export const setLocalUserAccount = createAction<LocalUserAccount>('localUserAccount/setLocalUserAccount');
export const silentLocalLogin = createAction<LocalUser>('localUserAccount/silentLocalLogin');
export const silentLocalLoginSuccess = createAction<LocalUser>('localUserAccount/silentLocalLoginSuccess');
export const silentLocalLoginFailure = createAction<string>('localUserAccount/silentLocalLoginFailure');
