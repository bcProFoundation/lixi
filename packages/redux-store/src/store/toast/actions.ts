import { createAction } from '@reduxjs/toolkit';

import { ToastType } from './state';

export type ToastConfig = {
  message: string;
  description?: string;
  duration?: number;
};

export const showToast = createAction(
  'toast/showToast',
  (type: ToastType, config: ToastConfig, isLink?: boolean, linkDescription?: string) => {
    return {
      payload: {
        type,
        config,
        isLink,
        linkDescription
      }
    };
  }
);

export const closeToast = createAction('toast/closeToast');
