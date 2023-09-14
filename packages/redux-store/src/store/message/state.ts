export interface IPageMessageSessionState {
  pageMessageSessionId: string;
  senderAddress: string;
  latestMessageId: string;
}

export interface PageMessageState {
  pageMessageSessionState: IPageMessageSessionState[];
}
