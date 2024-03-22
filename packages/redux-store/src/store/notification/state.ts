import { NotificationDto } from '@bcpros/lixi-models/lib/common/notification';
import { EntityState } from '@reduxjs/toolkit';

export interface NotificationsState extends EntityState<NotificationDto, string> {
  channelStatusOn: boolean;
  serverStatusOn: boolean;
}
