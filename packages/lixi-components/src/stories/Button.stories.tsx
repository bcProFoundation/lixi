import React from 'react';
import { StoryFn, Meta } from '@storybook/react';

import { Button } from './Button';

export default {
  title: 'Example/Button',
  component: Button,
  argTypes: {
    backgroundColor: { control: 'color' }
  }
} as Meta<typeof Button>;

export const Primary = {
  args: {
    primary: true,
    label: 'Button'
  }
};

export const Secondary = {
  args: {
    label: 'Button'
  }
};

export const Large = {
  args: {
    size: 'large',
    label: 'Button'
  }
};

export const Small = {
  args: {
    size: 'small',
    label: 'Button'
  }
};
