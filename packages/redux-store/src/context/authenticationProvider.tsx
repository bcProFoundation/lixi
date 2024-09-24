import { getSelectedAccount, silentLogin } from '@store/account';
import { useSliceDispatch, useSliceSelector } from '@store/index';
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
  const dispatch = useSliceDispatch();

  useEffect(() => {
    if (selectedAccount) {
      const dataSilentLogin: SilentLoginType = {
        mnemonic: selectedAccount.mnemonic,
        coin: selectedAccount?.coin ?? COIN.XPI
      }
      dispatch(silentLogin(dataSilentLogin));
    }
  }, []);

  return <AuthenticationContext.Provider value={authentication}>{children}</AuthenticationContext.Provider>;
};
