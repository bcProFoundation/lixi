import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from 'react';
import { connectWebSocket } from '@store/websocket/websocketUtils'; // Implement this function
import { io, Socket } from 'socket.io-client';
import { useSliceDispatch, useSliceSelector } from '@store/index';
import { connectToChannels } from '@store/websocket';
import { getSelectedAccount } from '@store/account';
import {
  userSubcribeToAddressChannel,
  userSubcribeToMultiPageMessageSession,
} from '@store/message/actions';
import usePrevious from '../hooks/usePrevious';
import { Account } from '@bcpros/lixi-models/lib/account/account.model';

export const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};


const socketDefaltUrl = process.env.NEXT_PUBLIC_LIXI_API ? process.env.NEXT_PUBLIC_LIXI_API : 'https://lixi.social';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketUrl, setSocketUrl] = useState<string>(socketDefaltUrl);
  const dispatch = useSliceDispatch();
  const selectedAccount = useSliceSelector(getSelectedAccount);
  const previousSelectedAccount: Account = usePrevious(selectedAccount);


  // You would call this function when you need to change the URL
  const changeSocketUrl = (newUrl: string) => {
    setSocketUrl(newUrl);
  };

  useEffect(() => {
    const setupSocket = async () => {
      const newSocket = await connectWebSocket(socketUrl ?? socketDefaltUrl);
      setSocket(newSocket);
    };

    setupSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socketUrl]);

  useEffect(() => {
    if (socket) {
      dispatch(connectToChannels());
    }
  }, [socket]);

  useEffect(() => {
    if (socket && selectedAccount) {
      dispatch(userSubcribeToMultiPageMessageSession(selectedAccount.id));
      dispatch(userSubcribeToAddressChannel(selectedAccount.address));
    }
  }, [socket, selectedAccount]);

  useEffect(() => {
    //if change account, disconnect socket and reconnect
    if (
      previousSelectedAccount &&
      selectedAccount?.address !== previousSelectedAccount?.address
    ) {
      if (socket) socket.disconnect();

      const setupSocket = async () => {
        const newSocket = await connectWebSocket(socketUrl);
        setSocket(newSocket);
      };

      setupSocket();
    }
  }, [selectedAccount]);

  return (
    <SocketContext.Provider value={{ socket, changeSocketUrl }}>{children}</SocketContext.Provider>
  );
}
