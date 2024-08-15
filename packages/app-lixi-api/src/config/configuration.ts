import { merge } from 'lodash';
import DefaultConfig from './config.default';
import { Config } from './config.interface';

export default () => {
  const defaultEnv = {
    cloudflare: {
      cfAccountId: process.env.CF_ACCOUNT_ID,
      cfAccountHash: process.env.CF_ACCOUNT_HASH,
      cfImagesToken: process.env.CF_IMAGES_TOKEN,
      cfImagesDeliveryUrl: process.env.CF_IMAGES_DELIVERY_URL
    },
    telegram_bot: {
      telegram_local_ecash_bot_token: process.env.TELEGRAM_LOCAL_ECASH_BOT_TOKEN
    }
  };

  let envConfig = {};
  try {
    envConfig = require(`./config.${process.env.NODE_ENV}`).default;
  } catch (e) {}

  return merge(DefaultConfig(), defaultEnv, envConfig);
};
