import { OfferFilterInput } from '../../generated/types.generated'; 
import { WebAuthnConfig, WebPushNotifConfig } from './model';

export interface SettingsState {
  navCollapsed: boolean;
  locale: string;
  initIntlStatus: boolean;
  webAuthnConfig?: WebAuthnConfig;
  webPushNotifConfig?: WebPushNotifConfig;
  filterPostsHome: number;
  filterPostsPage: number;
  filterPostsToken: number;
  filterPostsProfile: number;
  isPostsByTime: boolean;
  currentThemes: string;
  isSystemThemes: boolean;
  levelFilter: number;
  negativeDana: boolean;
  minimumDanaFilter: number;
  offerFilterConfig: OfferFilterInput;
  lastSeedBackupTime: string;
}
