import React from 'react';

import Settings from '@components/Settings';
import DeviceProtectableComponentWrapper from '@components/Authentication/DeviceProtectableComponentWrapper';

const SettingsPage = () => {
  return (
    <DeviceProtectableComponentWrapper>
      <Settings />
    </DeviceProtectableComponentWrapper>
  );
};

export default SettingsPage;
