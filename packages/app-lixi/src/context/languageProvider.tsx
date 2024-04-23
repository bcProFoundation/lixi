import { useIntl } from '@local-hooks/useIntl';
import { LanguageContext } from './languageContext';

export const LanguageProvider = ({ children }) => {
  const { initIntlDone, currentLocale } = useIntl();
  return <LanguageContext.Provider value={{ initIntlDone, currentLocale }}>{children}</LanguageContext.Provider>;
};
