import { WalletState } from './wallet';
import { AccountsState } from './account';
import { LocalUserAccountsState } from './localAccount';
import { PostState } from './post';
import { LixiesState } from './lixi';
import { ClaimsState } from './claim';
import { EnvelopesState } from './envelope';
import { LoadingState } from './loading';
import { ModalState } from './modal';
import { ActionSheetState } from './action-sheet';
import { ToastState } from './toast';
import { ErrorState } from './error';
import { SettingsState } from './settings';
import { NotificationsState } from './notification';
import { PageState } from './page';
import { TokenState } from './token';
import { CitiesState, CountriesState, StatesState } from './country';
import { PageCategory } from '@bcpros/lixi-models/lib/pageCategory';
import { PaymentMethodType } from '@bcpros/lixi-models/lib/paymentMethod';
import { EntityState } from '@reduxjs/toolkit';
import { BurnState } from './burn';
import { PageMessageSessionState } from './message';
import { CombinedState } from '@reduxjs/toolkit/query';
import { ActionState } from './action';
import { PersistState } from 'redux-persist';
import { Currencies } from '@bcpros/lixi-models/lib/escrow/currencies.model';
import { CoinList } from '@bcpros/lixi-models/lib/escrow/coin-list.model';

export type LixiStoreStateInterface = {
  wallet: WalletState;
  accounts: AccountsState;
  localAccounts: LocalUserAccountsState;
  posts: PostState;
  lixies: LixiesState;
  claims: ClaimsState;
  envelopes: EnvelopesState;
  loading: LoadingState;
  modal: ModalState;
  actionSheet: ActionSheetState;
  toast: ToastState;
  error: ErrorState;
  settings: SettingsState;
  notifications: NotificationsState;
  pages: PageState;
  tokens: TokenState;
  countries: CountriesState;
  states: StatesState;
  cities: CitiesState;
  categories: EntityState<PageCategory, number> & {
    selectedCategoryId: number;
  };
  paymentMethods: EntityState<PaymentMethodType, number> & {
    selectedPaymentMethodId: number;
  };
  currencies: EntityState<Currencies, number> & {
    selectedCurrencyId: number;
  };
  coinList: EntityState<CoinList, number> & {
    selectedCoinId: number;
  };
  burn: BurnState;
  pageMessage: PageMessageSessionState;
  api: CombinedState<{}, never, 'api'>;
  _persist: PersistState;
  action: ActionState;
};
