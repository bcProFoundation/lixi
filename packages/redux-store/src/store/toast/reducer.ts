import { createReducer } from '@reduxjs/toolkit';
import _ from 'lodash';

import { closeToast, showToast } from './actions';
import { ToastItemState, ToastState } from './state';

const initialState: ToastState = {
  toastStates: []
};

export const toastReducer = createReducer(initialState, builder => {
  builder
    .addCase(showToast, (state, action) => {
      const { type, config } = action.payload;
      let newToast: ToastItemState = {
        type: type,
        config: config
      };
      state.toastStates.push(newToast);
    })
    .addCase(closeToast, (state, action) => {
      state.toastStates = [];
    });
});
