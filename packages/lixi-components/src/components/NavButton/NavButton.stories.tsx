import { HomeOutlined, GiftOutlined, WalletOutlined, UserOutlined } from '@ant-design/icons';
import { ThemeProvider } from 'styled-components';
import { theme } from '../../styles/theme';
import { NavButton } from './NavButton';

export default {
  title: 'NavButton',
  decorators: [story => <ThemeProvider theme={theme}>{story()}</ThemeProvider>]
};

export const HomeNavButton = {
  render: () => {
    return (
      <NavButton active={true}>
        <HomeOutlined />
        Home
      </NavButton>
    );
  },

  name: 'Home NavButton',

  parameters: {
    notes: 'Displaying a Home NavButton'
  }
};

export const MyGivingNavButton = {
  render: () => {
    return (
      <NavButton active={true}>
        <GiftOutlined />
        My Giving
      </NavButton>
    );
  },

  name: 'My Giving NavButton',

  parameters: {
    notes: 'Displaying a Home NavButton'
  }
};

export const MyReceive = {
  render: () => {
    return (
      <NavButton active={true}>
        <WalletOutlined />
        My Receive
      </NavButton>
    );
  },

  parameters: {
    notes: 'Displaying a MyReceive NavButton'
  }
};

export const ProfileNavButton = {
  render: () => {
    return (
      <NavButton active={false}>
        <UserOutlined />
        Profile
      </NavButton>
    );
  },

  name: 'Profile NavButton',

  parameters: {
    notes: 'Displaying a Home NavButton'
  }
};
