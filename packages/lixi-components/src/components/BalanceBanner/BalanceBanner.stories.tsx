import { ThemeProvider } from 'styled-components';
import { GlobalStyle } from '../../styles/GlobalStyle';
import { theme } from '../../styles/theme';

import BalanceBanner from './BalanceBanner';

BalanceBanner.defaultProps = {
  theme: theme
};

export default {
  title: 'BalanceBanner',

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
    const title = 'My Giving';

    return <BalanceBanner title={title} />;
  },

  name: 'default',

  parameters: {
    notes: 'Displaying a BalanceBanner'
  }
};
