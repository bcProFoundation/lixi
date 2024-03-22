import { EntityState } from '@reduxjs/toolkit';

export interface IPageMessageSessionState {
  pageMessageSessionId: string;
  senderAddress: string;
  latestMessageId: string;
}

export interface PageMessageSessionState extends EntityState<IPageMessageSessionState, string> {
  selectedId: string;
}
