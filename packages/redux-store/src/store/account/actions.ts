import { GenerateAccountType, ImportAccountType, SilentLoginType } from '@bcpros/lixi-models/constants/account';
import { COIN } from '@bcpros/lixi-models/constants/coins/coin';
import {
  ChangeAccountLocaleCommand,
  CreateAccountCommand,
  DeleteAccountCommand,
  LoginViaEmailCommand,
  RegisterViaEmailNoVerifiedCommand,
  RenameAccountCommand,
  SecondaryLanguageAccountCommand
} from '@bcpros/lixi-models/lib/account/account.dto';
import { Account } from '@bcpros/lixi-models/lib/account/account.model';
import { Lixi } from '@bcpros/lixi-models/lib/lixi';
import { Upload } from '@bcpros/lixi-models/lib/upload';
import { createAction } from '@reduxjs/toolkit';
import { WorshipedPersonFieldsFragment as WorshipedPerson } from '@store/worship/worshipedPerson.generated';

export const generateAccount = createAction<GenerateAccountType>('account/generateAccount');
export const setAccountInfoTemp = createAction<any>('account/setAccountInfoTemp');
export const getAccount = createAction<number>('account/getAccount');
export const getAccountSuccess = createAction<Account>('account/getAccountSuccess');
export const getAccountFailure = createAction<string>('account/getAccountFailure');
export const postAccount = createAction<CreateAccountCommand>('account/postAccount');
export const postAccountSuccess = createAction<Account>('account/postAccountSuccess');
export const postAccountFailure = createAction<string>('account/postAccountFailure');
export const setAccount = createAction<any>('account/setAccount');
export const setAccountAvatar = createAction<string>('account/setAccountAvatar');
export const setAccountCover = createAction<string>('account/setAccountCover');
export const setAccountSuccess = createAction<Account>('account/setAccountSuccess');
export const selectAccount = createAction<number>('account/selectAccount');
export const selectAccountSuccess = createAction<{
  account: Account;
  lixies: Lixi[];
  previousAccount: Account;
}>('account/selectAccountSuccess');
export const selectAccountFailure = createAction<string>('account/selectAccountFailure');
export const importAccount = createAction<ImportAccountType>('account/importAccount');
export const importAccountSuccess = createAction<{
  account: Account;
  lixies: Lixi[];
}>('account/importAccountSuccess');
export const importAccountFailure = createAction<string>('account/importAccountFailure');
export const renameAccount = createAction<RenameAccountCommand>('account/renameAccount');
export const renameAccountSuccess = createAction<Account>('account/renameAccountSuccess');
export const renameAccountFailure = createAction<string>('account/renameAccountFailure');
export const changeAccountLocale = createAction<ChangeAccountLocaleCommand>('account/changeAccountLocale');
export const changeAccountLocaleSuccess = createAction<Account>('account/changeAccountLocaleSuccess');
export const changeAccountLocaleFailure = createAction<string>('account/changeAccountLocaleFailure');
export const deleteAccount = createAction<DeleteAccountCommand>('account/deleteAccount');
export const deleteAccountSuccess = createAction<number>('account/deleteAccountSuccess');
export const deleteAccountFailure = createAction<string>('account/deleteAccountFailure');
export const refreshLixiList = createAction<any>('lixi/refreshLixiList');
export const refreshLixiListSuccess = createAction<{
  account: Account;
  lixies: Lixi[];
}>('lixi/refreshLixiListSuccess');
export const refreshLixiListFailure = createAction<string>('lixi/refreshLixiListFailure');
export const refreshLixiListSilent = createAction<any>('lixi/refreshLixiListSilent');
export const refreshLixiListSilentSuccess = createAction<{
  account: Account;
  lixies: Lixi[];
}>('lixi/refreshLixiListSilentSuccess');
export const refreshLixiListSilentFailure = createAction<string>('lixi/refreshLixiListSilentFailure');
export const silentLogin = createAction<SilentLoginType>('account/silentLogin');
export const silentLoginSuccess = createAction('account/silentLoginSuccess');
export const silentLoginFailure = createAction('account/silentLoginFailure');
export const setUpload = createAction<{
  upload: Upload;
  type: any;
  imageUploadableId?: string;
}>('account/setUpload');
export const removeUpload = createAction<{ uploadType: any; id?: string }>('account/removeUpload');
export const removeUploadFromCache = createAction<{
  uploadType: any;
  id?: string;
}>('account/removeUploadFromCache');
export const removeAllUpload = createAction('account/removeAllUpload');
export const removeAllMessageUpload = createAction('account/removeAllMessageUpload');
export const loginViaEmail = createAction<LoginViaEmailCommand>('account/loginViaEmail');
export const loginViaEmailSuccess = createAction<any>('account/loginViaEmailSuccess');
export const loginViaEmailFailure = createAction<any>('account/loginViaEmailFailure');
export const registerViaEmailNoVerified = createAction<RegisterViaEmailNoVerifiedCommand>(
  'account/registerViaEmailNoVerified'
);
export const registerViaEmailNoVerifiedSuccess = createAction<any>('account/registerViaEmailNoVerifiedSuccess');
export const registerViaEmailNoVerifiedFailure = createAction<any>('account/registerViaEmailNoVerifiedFailure');
export const verifyEmail = createAction<LoginViaEmailCommand>('account/verifyEmail');
export const verifyEmailSuccess = createAction<any>('account/verifyEmailSuccess');
export const verifyEmailFailure = createAction<any>('account/verifyEmailFailure');
export const saveEditorTextToCache = createAction<string>('posts/saveEditorToCache');
export const deleteEditorTextFromCache = createAction('posts/deleteEditorTextFromCache');

export const getLeaderboard = createAction('account/getLeaderboard');
export const getLeaderboardSuccess = createAction<Array<Account & { totalBurned: number }>>(
  'account/getLeaderboardSuccess'
);
export const getLeaderboardFailure = createAction<string>('account/getLeaderboardFailure');
export const setTransactionReady = createAction('account/setTransactionReady');
export const setTransactionNotReady = createAction('account/setTransactionNotReady');
export const setGraphqlRequestLoading = createAction('account/setGraphqlRequestLoading');
export const setGraphqlRequestDone = createAction('account/setGraphqlRequestDone');
export const addRecentVisitedPerson = createAction<WorshipedPerson>('account/addRecentVisitedPerson');
export const clearRecentVisitedPeople = createAction('account/clearRecentVisitedPeople');
export const addRecentHashtagAtHome = createAction<string>('account/addRecentHashtagAtHome');
export const removeRecentHashtagAtHome = createAction<string>('account/removeRecentHashtagAtHome');
export const clearRecentHashtagAtHome = createAction('account/clearRecentHashtagAtHome');
export const addRecentHashtagAtPages = createAction<{
  id: string;
  hashtag: string;
}>('account/addRecentHashtagAtPages');
export const removeRecentHashtagAtPages = createAction<{
  id: string;
  hashtag: string;
}>('account/removeRecentHashtagAtPages');
export const clearRecentHashtagAtPages = createAction<{ id: string }>('account/clearRecentHashtagAtPages');
export const addRecentHashtagAtToken = createAction<{
  id: string;
  hashtag: string;
}>('account/addRecentHashtagAtToken');
export const removeRecentHashtagAtToken = createAction<{
  id: string;
  hashtag: string;
}>('account/removeRecentHashtagAtToken');
export const clearRecentHashtagAtToken = createAction<{ id: string }>('account/clearRecentHashtagAtToken');
export const setSecondaryLanguageAccount = createAction<SecondaryLanguageAccountCommand>(
  'account/setSecondaryLanguageAccount'
);
export const setSecondaryLanguageAccountSuccess = createAction<Account>('account/setSecondaryLanguageAccountSuccess');
export const setSecondaryLanguageAccountFailure = createAction<string>('account/setSecondaryLanguageAccountFailure');

export const setScrollToCommentId = createAction<string>('account/setScrollToCommentId');
export const setAccountCoin = createAction<{ id: number; accountCoin: COIN }>('account/setAccountCoin');
