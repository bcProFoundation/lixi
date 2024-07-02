import { ThemeProvider } from 'styled-components';
import { theme } from '../../styles/theme';
import GivingItem from './GivingItem';

export default {
  title: 'GivingItem',
  decorators: [story => <ThemeProvider theme={theme}>{story()}</ThemeProvider>]
};

export const Default = {
  render: () => {
    const description = 'Lucky money for abcpros team';
    const givingDate = new Date();
    const givingAmount = '10002';
    const ticker = 'XPI';
    const giftNumber = 5;

    return (
      <GivingItem
        description={description}
        givingDate={givingDate}
        givingAmount={givingAmount}
        ticker={ticker}
        giftNumber={giftNumber}
      />
    );
  },

  name: 'default',

  parameters: {
    notes: 'Displaying a GivingItem'
  }
};
