import AppLocale from '@lang/index';
import { useEffect, useState } from 'react';
import intl from 'react-intl-universal';

export const useIntl = () => {
  const [initIntlDone, setInitIntlDone] = useState(false);
  const [currentLocale, setCurrentLocale] = useState(
    intl.determineLocale({
      cookieLocaleKey: 'locale'
    })
  );

  const LOCALES_LIST = Object.keys(AppLocale);

  useEffect(() => {
    const initializeIntl = async () => {
      // 1. Fallback to "en-US" if not supported
      if (!LOCALES_LIST.some(item => item === currentLocale)) {
        setCurrentLocale('en');
      }

      // 2. Load locale data and set currentLocale
      intl.init({
        // debug: true (optional),
        currentLocale,
        locales: {
          currentLocale: AppLocale[currentLocale]
        }
      });
      setInitIntlDone(true);
    };

    initializeIntl();
  }, [currentLocale]); // Re-run on locale change

  const handleChangeLocale = (newLocale: string) => {
    setCurrentLocale(newLocale);
  };

  return { initIntlDone, currentLocale, handleChangeLocale };
};
