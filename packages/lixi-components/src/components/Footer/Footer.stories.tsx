import { HomeOutlined, GiftOutlined, WalletOutlined, UserOutlined } from '@ant-design/icons';
import { ThemeProvider } from 'styled-components';
import { theme } from '../../styles/theme';
import { NavButton } from '../NavButton/NavButton';
import Footer from './Footer';

export default {
  title: 'Footer',
  decorators: [story => <ThemeProvider theme={theme}>{story()}</ThemeProvider>]
};

export const _Footer = {
  render: () => {
    return (
      <Footer>
        <NavButton active={true}>
          <HomeOutlined />
          Home
        </NavButton>
        <NavButton>
          <GiftOutlined />
          My Giving
        </NavButton>
        <NavButton>
          <WalletOutlined />
          My Receive
        </NavButton>
        <NavButton active={false}>
          <UserOutlined />
          Profile
        </NavButton>
      </Footer>
    );
  },

  parameters: {
    notes: 'Displaying a Home NavButton'
  }
};
