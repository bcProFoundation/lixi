import { getSelectedAccount, silentLogin } from '@store/account';
import { getSelectedWalletPath, useSliceDispatch, useSliceSelector } from '@store/index';
import { createContext, useEffect } from 'react';
import useWebAuthentication, { DeviceAuthenticationValue } from '../hooks/useDeviceAuthentication';
import { shallowEqual } from 'react-redux';
import { SilentLoginType } from '@bcpros/lixi-models/constants/account';
import { COIN } from '@bcpros/lixi-models/constants/coins/coin';

export const AuthenticationContext = createContext<DeviceAuthenticationValue | undefined>(undefined);

export const AuthenticationProvider = ({ children }) => {
  // useWebAuthentication returns null if Web Authn is not supported
  const authentication = useWebAuthentication();
  const selectedAccount = useSliceSelector(getSelectedAccount, shallowEqual);
  const selectedWalletPath = useSliceSelector(getSelectedWalletPath, shallowEqual);
  const dispatch = useSliceDispatch();

  useEffect(() => {
    if (selectedAccount && selectedWalletPath) {
      const dataSilentLogin: SilentLoginType = {
        mnemonic: selectedAccount.mnemonic,
        coin: selectedAccount?.rootCoin ?? COIN.XPI
      };
      dispatch(silentLogin(dataSilentLogin));
    }
  }, []);

  return <AuthenticationContext.Provider value={authentication}>{children}</AuthenticationContext.Provider>;
};
