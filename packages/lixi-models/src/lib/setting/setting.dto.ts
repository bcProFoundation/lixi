import { Nullable } from '../nullable';

export interface UpdateSettingCommand {
  accountId: number;
  lastSeedBackupTime?: Nullable<Date>;
}
