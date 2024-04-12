import { useIntl } from '@local-hooks/useIntl';
import { LanguageContext } from './languageContext';

export const LanguageProvider = ({ children }) => {
  const { initIntlDone, currentLocale, handleChangeLocale } = useIntl();
  return (
    <LanguageContext.Provider value={{ initIntlDone, currentLocale, handleChangeLocale }}>
      {children}
    </LanguageContext.Provider>
  );
};
