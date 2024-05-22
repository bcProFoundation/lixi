import React, { useEffect } from 'react';
import { WrapperPage } from '@components/Settings';
import NotificationPopup from '@components/NotificationPopup';
import { getAllNotifications } from '@store/notification/selectors';
import { fetchNotifications } from '@store/notification/actions';
import { useSliceDispatch, useSliceSelector } from '@store/index';
import { getSelectedAccount } from '@store/account/selectors';

const NotificationComponent = () => {
  const dispatch = useSliceDispatch();
  const selectedAccount = useSliceSelector(getSelectedAccount);
  const notifications = useSliceSelector(getAllNotifications);

  return <WrapperPage className="card">{NotificationPopup(notifications, selectedAccount)}</WrapperPage>;
};

export default NotificationComponent;
