interface DivProps extends React.HTMLProps<HTMLDivElement> {
  'data-testid'?: string;
}
export type NotificationPlacement = 'top' | 'topLeft' | 'topRight' | 'bottom' | 'bottomLeft' | 'bottomRight';
export type IconType = 'success' | 'info' | 'error' | 'warning';

export interface ArgsProps {
  message: React.ReactNode;
  description?: React.ReactNode;
  btn?: React.ReactNode;
  key?: React.Key;
  onClose?: () => void;
  duration?: number | null;
  icon?: React.ReactNode;
  placement?: NotificationPlacement;
  style?: React.CSSProperties;
  className?: string;
  readonly type?: IconType;
  onClick?: () => void;
  closeIcon?: React.ReactNode;
  props?: DivProps;
  role?: 'alert' | 'status';
}

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'open' | 'burn' | null;

export interface ToastState {
  event: {
    type: ToastType;
    config?: ArgsProps | null;
  };
}
