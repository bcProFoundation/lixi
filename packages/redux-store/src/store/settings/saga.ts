import { ChangeAccountLocaleCommand } from '@bcpros/lixi-models/lib/account/account.dto';
import { Account } from '@bcpros/lixi-models/lib/account/account.model';
import { PayloadAction } from '@reduxjs/toolkit';
import { changeAccountLocale } from '@store/account/actions';
import { getSelectedAccount } from '@store/account/selectors';
import { getLocaleByLanguage } from '../../utils/languages';
import { all, fork, put, select, takeLatest } from 'redux-saga/effects';

import { loadLocaleFailure, updateLanguage } from './actions';

import 'moment/locale/vi';
import Cookies from 'universal-cookie';

function* updateLanguageSaga(action: PayloadAction<string>) {
  try {
    const language: string = action.payload ?? 'en';
    const selectedAccount: Account | undefined = yield select(getSelectedAccount);

    const cookies = new Cookies(null, { path: '/' });
    const locale = getLocaleByLanguage(language);
    cookies.set('locale', locale);

    const command: ChangeAccountLocaleCommand = {
      id: selectedAccount.id,
      mnemonic: selectedAccount?.mnemonic,
      language: language
    };
    yield put(changeAccountLocale(command));
  } catch {
    yield put(loadLocaleFailure(updateLanguage.type));
  }
}

function* watchupdateLanguage() {
  yield takeLatest(updateLanguage.type, updateLanguageSaga);
}

export default function* lixiSaga() {
  yield all([fork(watchupdateLanguage)]);
}
