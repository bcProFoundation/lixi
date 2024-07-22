import { injectStore as reduxInjectstore } from '@utils/axiosClient';
import AppLocale from '@lang/index';
import intl from 'react-intl-universal';
import { injectStore } from '../utils/axiosClient';
import { useInit } from './useInit';
import { useSliceDispatch, useSliceSelector } from '@store/index';
import { getCurrentLocale, getIntlInitStatus } from '@store/settings/selectors';
import { setInitIntlStatus } from '@store/settings/actions';

export const useIntl = () => {
  const currentLocale = useSliceSelector(getCurrentLocale);
  const initIntlDone = useSliceSelector(getIntlInitStatus);
  const dispatch = useSliceDispatch();

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
    injectStore(lang);
    reduxInjectstore(lang);
    dispatch(setInitIntlStatus(true));
  };

  useInit(() => {
    initializeIntl();
  }, [currentLocale]);

  return { initIntlDone, currentLocale };
};
