import { injectStore as reduxInjectstore } from '@utils/axiosClient';
import AppLocale from '@lang/index';
import { useEffect, useState } from 'react';
import intl from 'react-intl-universal';
import { injectStore } from '../utils/axiosClient';
import { useInit } from './useInit';

export const useIntl = () => {
  const [initIntlDone, setInitIntlDone] = useState(false);
  const [currentLocale, setCurrentLocale] = useState('en-US');

  const LOCALES_LIST = Object.keys(AppLocale);

  const initializeIntl = async () => {
    let locale = intl.determineLocale({
      urlLocaleKey: 'lang',
      cookieLocaleKey: 'locale'
    });

    // 1. Fallback to "en-US" if not supported
    if (!LOCALES_LIST.some(item => item === locale)) {
      locale = 'en-US';
    }

    // 2. Load locale data and set currentLocale
    intl.init({
      currentLocale: locale,
      locales: {
        [locale]: AppLocale[locale].messages
      }
    });
    const lang = currentLocale.split('-')[0];
    setCurrentLocale(currentLocale);
    injectStore(lang);
    reduxInjectstore(lang);
    setInitIntlDone(true);
  };

  useInit(() => {
    initializeIntl();
  });

  return { initIntlDone, currentLocale };
};
