import React from 'react';

import { ThemeProvider } from 'styled-components';
import { GlobalStyle } from '../../styles/GlobalStyle';
import { theme } from '../../styles/theme';
import ApiError from './ApiError';

export default {
  title: 'ApiError',

  decorators: [
    story => (
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        {story()}
      </ThemeProvider>
    )
  ]
};

export const Default = {
  render: () => {
    return <ApiError></ApiError>;
  },

  name: 'default'
};
