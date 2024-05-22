import React, { useEffect } from 'react';
import { useSliceDispatch, useSliceSelector } from '@store/index';
import usePrevious from './usePrevious';
import { getSelectedAccount } from '@store/account';
import { getIsServerStatusOn, userOffline, userOnline } from '@store/notification';
import { getDeviceId } from '@store/settings';
import { Account, SocketUser } from '@bcpros/lixi-models';
import { useSocket } from '@context/socketContext';

/**
 * Tracking user status
 */
const useUserStatus = () => {
  const dispatch = useSliceDispatch();
  const selectedAccount = useSliceSelector(getSelectedAccount);
  const previousSelectedAccount: Account = usePrevious(selectedAccount);
  const isServerStatusOn = useSliceSelector(getIsServerStatusOn);
  const deviceId = useSliceSelector(getDeviceId);
  const socket = useSocket();

  useEffect(() => {
    if (selectedAccount && deviceId) {
      if (socket) {
        // user will be online
        const user: SocketUser = {
          address: selectedAccount.address,
          deviceId
        };
        dispatch(userOnline(user));
        if (previousSelectedAccount && previousSelectedAccount.address != selectedAccount.address) {
          // Only dispatch the action that user offline when the previous account
          // and current selected account are different, means that their address is different
          dispatch(
            userOffline({
              address: previousSelectedAccount.address,
              deviceId
            })
          );
        }
      }
    }
  }, [selectedAccount, isServerStatusOn, deviceId, socket]);
};

export default useUserStatus;
