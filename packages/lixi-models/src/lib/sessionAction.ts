export enum SessionActionEnum {
  OPEN = 'OPEN',
  CLOSE = 'CLOSE',
  SEEN = 'SEEN',
  TYPING = 'TYPING'
}

export interface SessionAction {
  type: SessionActionEnum;
  payload: any;
}
