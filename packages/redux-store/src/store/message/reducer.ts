import { NotificationDto } from '@bcpros/lixi-models/lib/common/notification';
import { createEntityAdapter, createReducer, Update } from '@reduxjs/toolkit';
import { removePageMessageSession, upsertPageMessageSession } from './actions';
import { PageMessageState } from './state';

export const pageMessageAdapter = createEntityAdapter<any>({});

const initialState: PageMessageState = pageMessageAdapter.getInitialState({
  pageMessageSessionState: []
});

export const messageReducer = createReducer(initialState, builder => {
  builder
    .addCase(removePageMessageSession, (state, action) => {
      const index = state.pageMessageSessionState.findIndex(x => x.pageMessageSessionId === action.payload);
      if (index !== -1) {
        state.pageMessageSessionState.splice(index, 1);
      }
    })
    .addCase(upsertPageMessageSession, (state, action) => {
      const { pageMessageSessionId, senderAddress, latestMessageId } = action.payload;
      const index = state.pageMessageSessionState.findIndex(x => x.pageMessageSessionId === pageMessageSessionId);
      if (index !== -1) {
        state.pageMessageSessionState[index].senderAddress = senderAddress;
        state.pageMessageSessionState[index].latestMessageId = latestMessageId;
      } else {
        state.pageMessageSessionState.push({
          pageMessageSessionId,
          senderAddress,
          latestMessageId
        });
      }
    });
});
