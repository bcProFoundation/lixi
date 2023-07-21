import { ArgsProps } from 'antd/lib/notification/interface';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'open' | 'burn' | null;

export interface ToastItemState {
  type: ToastType;
  config: ArgsProps;
}

export interface ToastState {
  toastStates: Array<any>;
}
