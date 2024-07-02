import { createContext } from 'react';

// We store the language in the context in the main app
// because the intl need to be init before the app rendering
// and also each app can have their own language files instead of sharing in redux-store
export const LanguageContext = createContext({
  initIntlDone: false,
  currentLocale: 'en-US'
});
