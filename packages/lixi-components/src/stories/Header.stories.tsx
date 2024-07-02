import React from 'react';
import { StoryFn, Meta } from '@storybook/react';

import { Header } from './Header';

export default {
  title: 'Example/Header',
  component: Header
} as Meta<typeof Header>;

export const LoggedIn = {
  args: {
    user: {}
  }
};

export const LoggedOut = {
  args: {}
};
