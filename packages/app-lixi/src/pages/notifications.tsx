import React from 'react';

import NotificationComponent from '@components/Notification';
import DeviceProtectableComponentWrapper from '@components/Authentication/DeviceProtectableComponentWrapper';

const NotificationPage = () => {
  return (
    <DeviceProtectableComponentWrapper>
      <NotificationComponent />
    </DeviceProtectableComponentWrapper>
  );
};

export default NotificationPage;
