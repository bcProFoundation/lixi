import { createAction } from '@reduxjs/toolkit';

import { ToastType } from './state';

export type ToastConfig = {
  message: string;
  description?: string | React.ReactElement;
  duration?: number;
};

export const showToast = createAction('toast/showToast', (type: ToastType, config: ToastConfig) => {
  return {
    payload: {
      type,
      config
    }
  };
});

export const closeToast = createAction('toast/closeToast');
