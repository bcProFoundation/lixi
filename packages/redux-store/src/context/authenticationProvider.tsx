import { getSelectedAccount, silentLogin } from '@store/account';
import { useSliceDispatch, useSliceSelector } from '@store/index';
import { createContext, useEffect } from 'react';
import useWebAuthentication, { DeviceAuthenticationValue } from '../hooks/useDeviceAuthentication';
import { shallowEqual } from 'react-redux';

export const AuthenticationContext = createContext<DeviceAuthenticationValue | undefined>(undefined);

export const AuthenticationProvider = ({ children }) => {
  // useWebAuthentication returns null if Web Authn is not supported
  const authentication = useWebAuthentication();
  const selectedAccount = useSliceSelector(getSelectedAccount, shallowEqual);
  const dispatch = useSliceDispatch();

  useEffect(() => {
    if (selectedAccount) {
      dispatch(silentLogin(selectedAccount.mnemonic));
    }
  }, []);

  return <AuthenticationContext.Provider value={authentication}>{children}</AuthenticationContext.Provider>;
};
