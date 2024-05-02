import { createReducer } from '@reduxjs/toolkit';
import _ from 'lodash';

import { closeToast, showToast } from './actions';
import { ToastState } from './state';

const initialState: ToastState = {
  event: {
    type: 'success',
    config: null
  }
};

export const toastReducer = createReducer(initialState, builder => {
  builder.addCase(showToast, (state, action) => {
    const { type, config } = action.payload;
    state.event.type = type;
    state.event.config = config as any;
  });
  builder.addCase(closeToast, (state, action) => {
    state.event.config = null;
  });
});
