export const getLocaleByLanguage = (lang: string) => {
  switch (lang) {
    case 'en':
      return 'en-US';
    case 'vi':
      return 'vi-VN';
  }
  return 'en-US';
};
